/**
 * GET /api/v1/usage
 *
 * Returns current usage consumption vs tier limits for the authenticated company.
 * Used by the dashboard usage widget to show progress bars and warnings.
 *
 * Response shape:
 * {
 *   "data": {
 *     "plan": "free",
 *     "period": "2026-02",
 *     "items": [
 *       { "resource": "bookings", "current": 42, "limit": 50, "unlimited": false, "percentUsed": 84, "warning": true },
 *       { "resource": "employees", "current": 2, "limit": 3, "unlimited": false, "percentUsed": 67, "warning": false },
 *       { "resource": "services", "current": 3, "limit": 5, "unlimited": false, "percentUsed": 60, "warning": false }
 *     ]
 *   }
 * }
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { successResponse } from '@/lib/utils/response';
import { getUsageSummary } from '@/lib/usage/usage-service';

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const usage = await getUsageSummary(companyId);
    return successResponse(usage);
  },
});
