/**
 * Automation Rule Detail Endpoints
 * GET    /api/v1/automation/rules/:id - Get single rule by UUID
 * PUT    /api/v1/automation/rules/:id - Update rule
 * DELETE /api/v1/automation/rules/:id - Delete rule
 */

import { eq, and } from 'drizzle-orm';
import { db, automationRules } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { automationRuleUpdateSchema } from '@schedulebox/shared';
import { z } from 'zod';
import { validateWebhookUrl } from '@/lib/security/ssrf';

/**
 * Params schema for automation rule UUID
 */
const ruleParamsSchema = z.object({
  id: z.string().uuid(),
});

type RuleParams = z.infer<typeof ruleParamsSchema>;

/**
 * GET /api/v1/automation/rules/:id
 * Get single automation rule by UUID
 */
export const GET = createRouteHandler({
  paramsSchema: ruleParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id } = params as RuleParams;

    const [rule] = await db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .limit(1);

    if (!rule) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Automation rule not found', 404);
    }

    return successResponse(rule);
  },
});

/**
 * PUT /api/v1/automation/rules/:id
 * Update automation rule
 *
 * Returns:
 * - 200: Rule updated successfully
 * - 404: Rule not found
 * - 400: Validation error
 */
export const PUT = createRouteHandler({
  paramsSchema: ruleParamsSchema,
  bodySchema: automationRuleUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id } = params as RuleParams;

    // Check if rule exists and belongs to company
    const [existingRule] = await db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .limit(1);

    if (!existingRule) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Automation rule not found', 404);
    }

    // SSRF protection: reject webhook URLs targeting private/internal networks (SEC-05)
    if (
      body.actionType === 'webhook' &&
      body.actionConfig &&
      typeof body.actionConfig === 'object' &&
      'url' in body.actionConfig &&
      body.actionConfig.url
    ) {
      validateWebhookUrl(String(body.actionConfig.url));
    }

    // Update rule
    const [updatedRule] = await db
      .update(automationRules)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .returning();

    return successResponse(updatedRule);
  },
});

/**
 * DELETE /api/v1/automation/rules/:id
 * Delete automation rule
 *
 * Returns:
 * - 204: Rule deleted successfully
 * - 404: Rule not found
 */
export const DELETE = createRouteHandler({
  paramsSchema: ruleParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id } = params as RuleParams;

    // Delete rule (only if belongs to company)
    const result = await db
      .delete(automationRules)
      .where(and(eq(automationRules.uuid, id), eq(automationRules.companyId, companyId)))
      .returning();

    if (result.length === 0) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Automation rule not found', 404);
    }

    return noContentResponse();
  },
});
