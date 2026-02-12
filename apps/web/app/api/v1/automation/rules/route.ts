/**
 * Automation Rules List and Create Endpoints
 * GET  /api/v1/automation/rules - List rules with optional filters
 * POST /api/v1/automation/rules - Create new automation rule
 */

import { eq, and, count } from 'drizzle-orm';
import { db, automationRules } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, paginatedResponse } from '@/lib/utils/response';
import {
  automationRuleCreateSchema,
  automationRuleListQuerySchema,
  type AutomationRuleListQuery,
} from '@schedulebox/shared';

/**
 * GET /api/v1/automation/rules
 * List automation rules with optional filters
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const query = validateQuery(automationRuleListQuerySchema, req) as AutomationRuleListQuery;

    // Build where conditions
    const conditions = [eq(automationRules.companyId, companyId)];

    if (query.triggerType) {
      conditions.push(eq(automationRules.triggerType, query.triggerType));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(automationRules.isActive, query.isActive));
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Query automation rules
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(automationRules)
        .where(and(...conditions))
        .limit(query.limit)
        .offset(offset)
        .orderBy(automationRules.createdAt),
      db
        .select({ count: count() })
        .from(automationRules)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / query.limit);

    return paginatedResponse(data, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: totalPages,
    });
  },
});

/**
 * POST /api/v1/automation/rules
 * Create new automation rule
 *
 * Returns:
 * - 201: Rule created successfully (includes UUID)
 * - 400: Validation error
 */
export const POST = createRouteHandler({
  bodySchema: automationRuleCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Insert automation rule
    const [rule] = await db
      .insert(automationRules)
      .values({
        companyId,
        name: body.name,
        description: body.description,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig ?? {},
        actionType: body.actionType,
        actionConfig: body.actionConfig ?? {},
        delayMinutes: body.delayMinutes ?? 0,
        isActive: body.isActive ?? true,
      })
      .returning();

    return successResponse(rule, 201);
  },
});
