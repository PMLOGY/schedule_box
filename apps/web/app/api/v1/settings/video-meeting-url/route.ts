/**
 * Video Meeting URL settings endpoints
 * GET  /api/v1/settings/video-meeting-url - Get custom meeting URL for authenticated company
 * PATCH /api/v1/settings/video-meeting-url - Set or clear custom meeting URL
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';
import { db, companies } from '@schedulebox/database';

// ============================================================================
// SCHEMAS
// ============================================================================

const videoMeetingUrlPatchSchema = z.object({
  custom_meeting_url: z
    .string()
    .max(500)
    .refine((val) => val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL or empty string to clear',
    }),
});

type VideoMeetingUrlPatch = z.infer<typeof videoMeetingUrlPatchSchema>;

// ============================================================================
// GET /api/v1/settings/video-meeting-url
// ============================================================================

/**
 * GET /api/v1/settings/video-meeting-url
 * Returns the custom meeting URL for the authenticated user's company.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    const [company] = await db
      .select({ custom_meeting_url: companies.customMeetingUrl })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return successResponse({ custom_meeting_url: company.custom_meeting_url ?? null });
  },
});

// ============================================================================
// PATCH /api/v1/settings/video-meeting-url
// ============================================================================

/**
 * PATCH /api/v1/settings/video-meeting-url
 * Updates (or clears) the custom meeting URL for the authenticated user's company.
 * Pass an empty string to clear the URL.
 */
export const PATCH = createRouteHandler<VideoMeetingUrlPatch>({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  bodySchema: videoMeetingUrlPatchSchema,
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);

    // Empty string means "clear the URL"
    const newUrl = body!.custom_meeting_url === '' ? null : body!.custom_meeting_url;

    const [updated] = await db
      .update(companies)
      .set({ customMeetingUrl: newUrl, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning({ custom_meeting_url: companies.customMeetingUrl });

    if (!updated) {
      throw new NotFoundError('Company not found');
    }

    return successResponse({ custom_meeting_url: updated.custom_meeting_url ?? null });
  },
});
