/**
 * Automation Rule Execution Endpoint
 * POST /api/v1/automation/execute - Execute an automation rule manually
 *
 * Dispatches rule action to the appropriate handler based on action_type.
 * Currently supports: send_push. Other action types return a no-op result.
 *
 * Each execution is logged in automation_logs for audit trail.
 */

import { eq, and } from 'drizzle-orm';
import { db, automationRules, automationLogs } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';
import { executeAutomationPush } from '@/lib/push/automation-push-handler';

/**
 * Request body schema
 */
const executeBodySchema = z.object({
  ruleId: z.number().int().positive(),
  customerId: z.number().int().positive().optional(),
  bookingId: z.number().int().positive().optional(),
});

/**
 * POST /api/v1/automation/execute
 * Execute an automation rule manually
 *
 * Returns:
 * - 200: Execution result
 * - 404: Rule not found or not in this company
 * - 400: Validation error
 */
export const POST = createRouteHandler({
  bodySchema: executeBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch the rule (with tenant isolation)
    const [rule] = await db
      .select()
      .from(automationRules)
      .where(and(eq(automationRules.id, body.ruleId), eq(automationRules.companyId, companyId)))
      .limit(1);

    if (!rule) {
      throw new NotFoundError('Automation rule not found');
    }

    // Create pending log entry
    const [logEntry] = await db
      .insert(automationLogs)
      .values({
        ruleId: rule.id,
        bookingId: body.bookingId ?? null,
        customerId: body.customerId ?? null,
        status: 'pending',
      })
      .returning({ id: automationLogs.id });

    let executionResult: Record<string, unknown> = {};
    let executionStatus: 'executed' | 'failed' | 'skipped' = 'executed';
    let errorMessage: string | null = null;

    try {
      const actionConfig = (rule.actionConfig ?? {}) as Record<string, unknown>;

      switch (rule.actionType) {
        case 'send_push': {
          const pushResult = await executeAutomationPush({
            ruleId: rule.id,
            companyId,
            customerId: body.customerId,
            bookingId: body.bookingId,
            actionConfig: {
              title: actionConfig.title as string | undefined,
              body: actionConfig.body as string | undefined,
              url: actionConfig.url as string | undefined,
            },
          });

          executionResult = pushResult;
          executionStatus = pushResult.success ? 'executed' : 'failed';
          if (!pushResult.success) {
            errorMessage = 'Push notification delivery failed or no target user found';
          }
          break;
        }

        case 'send_email': {
          // Email handler not yet wired — log as skipped
          executionResult = { message: 'send_email action not yet implemented in executor' };
          executionStatus = 'skipped';
          break;
        }

        case 'send_sms': {
          executionResult = { message: 'send_sms action not yet implemented in executor' };
          executionStatus = 'skipped';
          break;
        }

        default: {
          executionResult = {
            message: `Action type '${rule.actionType}' not yet implemented in executor`,
          };
          executionStatus = 'skipped';
          break;
        }
      }
    } catch (err) {
      executionStatus = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
      executionResult = { error: errorMessage };
      console.error(`[AutomationExecute] Rule ${rule.id} (${rule.actionType}) failed:`, err);
    }

    // Update log entry with result
    await db
      .update(automationLogs)
      .set({
        status: executionStatus,
        result: executionResult,
        errorMessage,
        executedAt: new Date(),
      })
      .where(eq(automationLogs.id, logEntry.id));

    return successResponse({
      ruleId: rule.id,
      ruleUuid: rule.uuid,
      actionType: rule.actionType,
      status: executionStatus,
      result: executionResult,
      logId: logEntry.id,
    });
  },
});
