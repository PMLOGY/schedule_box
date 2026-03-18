/**
 * Platform Admin Maintenance Mode API
 * GET /api/v1/admin/maintenance - Get current maintenance state
 * PUT /api/v1/admin/maintenance - Enable or disable maintenance mode
 *
 * Requires admin role.
 * Maintenance state is stored in Redis:
 *   maintenance:enabled — 'true' if active
 *   maintenance:message — optional custom message
 */

import { eq } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { users } from '@schedulebox/database';
import { redis } from '@/lib/redis/client';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';
import { writeAuditLog } from '@/lib/admin/audit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * GET /api/v1/admin/maintenance
 *
 * Returns current maintenance state.
 * Authorization: admin role only.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const [enabledRaw, message] = await Promise.all([
      redis.get<string>('maintenance:enabled'),
      redis.get<string>('maintenance:message'),
    ]);

    return successResponse({
      enabled: enabledRaw === 'true',
      message: message ?? null,
    });
  },
});

// ---- PUT: Toggle Maintenance Mode ----

const toggleMaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
});

/**
 * PUT /api/v1/admin/maintenance
 *
 * Enables or disables maintenance mode.
 * When enabling:
 *   - Sets maintenance:enabled = 'true' in Redis
 *   - Optionally sets maintenance:message
 *   - Sets maintenance_bypass cookie so admins keep access
 * When disabling:
 *   - Deletes maintenance:enabled and maintenance:message keys
 * Authorization: admin role only.
 */
export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: toggleMaintenanceSchema,
  handler: async ({ req, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    if (body.enabled) {
      await redis.set('maintenance:enabled', 'true');
      if (body.message) {
        await redis.set('maintenance:message', body.message);
      } else {
        await redis.del('maintenance:message');
      }
    } else {
      await redis.del('maintenance:enabled');
      await redis.del('maintenance:message');
    }

    const adminUuid = user.sub;
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, adminUuid))
      .limit(1);

    await writeAuditLog({
      req,
      adminUuid,
      adminId: adminRecord?.id ?? 0,
      actionType: 'maintenance_toggle',
      afterValue: { enabled: body.enabled, message: body.message ?? null },
    });

    const responseData = successResponse({
      enabled: body.enabled,
      message: body.message ?? null,
    });

    // If enabling maintenance, set bypass cookie so admin can still navigate
    if (body.enabled) {
      const bypassSecret = process.env.MAINTENANCE_BYPASS_SECRET;
      if (bypassSecret) {
        const jsonBody = await responseData.json();
        const res = NextResponse.json(jsonBody);
        res.cookies.set('maintenance_bypass', bypassSecret, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 86400, // 24 hours
          path: '/',
        });
        return res;
      }
    }

    return responseData;
  },
});
