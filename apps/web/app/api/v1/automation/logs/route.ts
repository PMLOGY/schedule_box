/**
 * Automation Logs List Endpoint
 * GET /api/v1/automation/logs - List automation execution logs
 */

import { eq, and, desc } from 'drizzle-orm';
import { db, automationLogs, automationRules } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Query schema for listing automation logs
 */
const logsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ruleId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'executed', 'failed', 'skipped']).optional(),
});

type LogsListQuery = z.infer<typeof logsListQuerySchema>;

/**
 * GET /api/v1/automation/logs
 * List automation execution logs for company
 *
 * Joins with automation_rules to ensure tenant isolation
 * (only show logs for rules belonging to user's company)
 *
 * Returns logs with rule name for context
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const query = validateQuery(logsListQuerySchema, req) as LogsListQuery;

    // Build where conditions
    // CRITICAL: Filter by company via automationRules join
    const conditions = [eq(automationRules.companyId, companyId)];

    if (query.ruleId) {
      conditions.push(eq(automationLogs.ruleId, query.ruleId));
    }

    if (query.status) {
      conditions.push(eq(automationLogs.status, query.status));
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Query logs with rule information (joined for tenant isolation + rule name)
    const [data, countResult] = await Promise.all([
      db
        .select({
          log: automationLogs,
          ruleName: automationRules.name,
          ruleUuid: automationRules.uuid,
        })
        .from(automationLogs)
        .innerJoin(automationRules, eq(automationLogs.ruleId, automationRules.id))
        .where(and(...conditions))
        .limit(query.limit)
        .offset(offset)
        .orderBy(desc(automationLogs.createdAt)),
      db
        .select({ count: db.$count(automationLogs.id) })
        .from(automationLogs)
        .innerJoin(automationRules, eq(automationLogs.ruleId, automationRules.id))
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / query.limit);

    // Flatten response
    const formattedData = data.map((row) => ({
      ...row.log,
      ruleName: row.ruleName,
      ruleUuid: row.ruleUuid,
    }));

    return paginatedResponse(formattedData, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: totalPages,
    });
  },
});
