/**
 * Automation Rule Toggle Endpoint
 * POST /api/v1/automation/rules/:id/toggle - Toggle rule active status
 */

import { eq, and } from 'drizzle-orm';
import { db, automationRules } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Params schema for automation rule UUID
 */
const ruleParamsSchema = z.object({
  id: z.string().uuid(),
});

type RuleParams = z.infer<typeof ruleParamsSchema>;

/**
 * POST /api/v1/automation/rules/:id/toggle
 * Toggle automation rule active status
 *
 * Convenience endpoint for quick enable/disable from UI
 *
 * Returns:
 * - 200: Rule toggled successfully with new isActive state
 * - 404: Rule not found
 */
export const POST = createRouteHandler({
  paramsSchema: ruleParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id } = params as RuleParams;

    // Get current rule
    const [currentRule] = await db
      .select({
        id: automationRules.id,
        isActive: automationRules.isActive,
      })
      .from(automationRules)
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .limit(1);

    if (!currentRule) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Automation rule not found', 404);
    }

    // Toggle isActive state
    const [updatedRule] = await db
      .update(automationRules)
      .set({
        isActive: !currentRule.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .returning();

    return successResponse(updatedRule);
  },
});
