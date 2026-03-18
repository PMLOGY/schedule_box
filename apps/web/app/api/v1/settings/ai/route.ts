/**
 * AI Settings Endpoints
 * GET /api/v1/settings/ai  — Read current AI config for company (merged with industry defaults)
 * PUT /api/v1/settings/ai  — Update AI config stored in industry_config.ai sub-key
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { successResponse } from '@/lib/utils/response';
import { db, companies } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { getIndustryAiDefaults } from '@/lib/industry/industry-ai-defaults';

// ============================================================================
// SCHEMAS
// ============================================================================

const aiSettingsUpdateSchema = z.object({
  upselling_enabled: z.boolean().optional(),
  capacity_mode: z.enum(['individual', 'group', 'standard']).optional(),
});

type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;

// ============================================================================
// GET /api/v1/settings/ai
// ============================================================================

/**
 * Returns AI config for the authenticated owner's company.
 * Merges industry defaults with any stored overrides.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    const [company] = await db
      .select({
        industryType: companies.industryType,
        industryConfig: companies.industryConfig,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const industryType = company.industryType ?? 'general';
    const defaults = getIndustryAiDefaults(industryType);
    const stored = (company.industryConfig as Record<string, unknown> | null)?.ai as
      | Record<string, unknown>
      | undefined;

    // Merge: stored values override defaults
    const aiConfig = {
      ...defaults,
      ...(stored ?? {}),
    };

    return successResponse({
      industry_type: industryType,
      upselling_enabled: aiConfig.upselling_enabled as boolean,
      capacity_mode: aiConfig.capacity_mode as string,
      defaults: {
        upselling_enabled: defaults.upselling_enabled,
        capacity_mode: defaults.capacity_mode,
      },
    });
  },
});

// ============================================================================
// PUT /api/v1/settings/ai
// ============================================================================

/**
 * Updates AI config stored in industry_config.ai sub-key.
 * Uses JSONB spread to preserve other sub-keys in industry_config.
 */
export const PUT = createRouteHandler<AiSettingsUpdate>({
  bodySchema: aiSettingsUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Fetch current company config
    const [company] = await db
      .select({
        industryType: companies.industryType,
        industryConfig: companies.industryConfig,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const currentConfig = (company.industryConfig as Record<string, unknown> | null) ?? {};
    const currentAi = (currentConfig.ai as Record<string, unknown> | undefined) ?? {};

    // Build updated ai sub-key
    const updatedAi: Record<string, unknown> = { ...currentAi };
    if (body!.upselling_enabled !== undefined) {
      updatedAi.upselling_enabled = body!.upselling_enabled;
    }
    if (body!.capacity_mode !== undefined) {
      updatedAi.capacity_mode = body!.capacity_mode;
    }

    // Merge into full industry_config
    const updatedConfig = {
      ...currentConfig,
      ai: updatedAi,
    };

    const [updated] = await db
      .update(companies)
      .set({ industryConfig: updatedConfig })
      .where(eq(companies.id, companyId))
      .returning({
        industryType: companies.industryType,
        industryConfig: companies.industryConfig,
      });

    if (!updated) {
      throw new NotFoundError('Company not found');
    }

    const industryType = updated.industryType ?? 'general';
    const defaults = getIndustryAiDefaults(industryType);
    const savedAi = ((updated.industryConfig as Record<string, unknown> | null)?.ai ??
      {}) as Record<string, unknown>;
    const aiConfig = { ...defaults, ...savedAi };

    return successResponse({
      industry_type: industryType,
      upselling_enabled: aiConfig.upselling_enabled as boolean,
      capacity_mode: aiConfig.capacity_mode as string,
      defaults: {
        upselling_enabled: defaults.upselling_enabled,
        capacity_mode: defaults.capacity_mode,
      },
    });
  },
});
