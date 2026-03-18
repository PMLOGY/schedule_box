/**
 * POST /api/v1/admin/impersonate  — Start impersonation session
 * DELETE /api/v1/admin/impersonate — End impersonation session
 *
 * Security:
 * - Only admin role can call these endpoints
 * - Cannot impersonate other admins
 * - Session limited to 15 minutes (JWT + DB expiry)
 * - Every start/end written to platform audit log
 * - imp_token set as HttpOnly cookie, not accessible to JS
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, roles, rolePermissions, permissions } from '@schedulebox/database';
import { authenticateRequest } from '@/lib/middleware/auth';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@schedulebox/shared';
import { z } from 'zod';
import {
  generateImpersonationToken,
  verifyImpersonationToken,
  endImpersonationSession,
} from '@/lib/admin/impersonation';
import { writeAuditLog } from '@/lib/admin/audit';

const startImpersonationSchema = z.object({
  targetUserUuid: z.string().uuid(),
});

/**
 * POST /api/v1/admin/impersonate
 *
 * Start an impersonation session for a non-admin user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const rawBody = await req.json();
    const { targetUserUuid } = startImpersonationSchema.parse(rawBody);

    // Fetch target user with role and permissions
    const [targetUser] = await db
      .select({
        id: users.id,
        uuid: users.uuid,
        name: users.name,
        email: users.email,
        companyId: users.companyId,
        roleId: users.roleId,
        roleName: roles.name,
        isActive: users.isActive,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.uuid, targetUserUuid))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    if (!targetUser.isActive) {
      throw new ForbiddenError('Cannot impersonate an inactive user');
    }

    if (targetUser.roleName === 'admin') {
      throw new ForbiddenError('Cannot impersonate another admin user');
    }

    // Fetch target user permissions
    const targetPerms = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, targetUser.roleId));

    const permissionNames = targetPerms.map((p) => p.name);

    // Extract IP from request
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp ?? 'unknown');

    // Fetch admin internal ID
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (!adminRecord) {
      throw new UnauthorizedError('Admin user not found');
    }

    const { token, sessionId, expiresAt } = await generateImpersonationToken(
      adminRecord.id,
      user.sub,
      {
        id: targetUser.id,
        uuid: targetUser.uuid,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.roleName,
        permissions: permissionNames,
        companyId: targetUser.companyId ?? 0,
      },
      ipAddress,
    );

    // Write audit log (must not fail silently)
    await writeAuditLog({
      req,
      adminUuid: user.sub,
      adminId: adminRecord.id,
      actionType: 'impersonation_start',
      targetEntityType: 'user',
      targetEntityId: targetUserUuid,
      afterValue: {
        sessionId,
        targetUser: { uuid: targetUserUuid, name: targetUser.name, role: targetUser.roleName },
        expiresAt: expiresAt.toISOString(),
      },
    });

    const response = successResponse({
      sessionId,
      targetUser: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.roleName,
      },
      expiresAt: expiresAt.toISOString(),
    });

    // Set HttpOnly cookie with the impersonation token
    response.cookies.set('imp_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 900, // 15 minutes
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/v1/admin/impersonate
 *
 * End an active impersonation session.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const impToken = req.cookies.get('imp_token')?.value;
    if (!impToken) {
      throw new UnauthorizedError('No active impersonation session');
    }

    const impPayload = await verifyImpersonationToken(impToken);

    await endImpersonationSession(impPayload.session_id);

    // Fetch admin internal ID for audit log
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (adminRecord) {
      await writeAuditLog({
        req,
        adminUuid: user.sub,
        adminId: adminRecord.id,
        actionType: 'impersonation_end',
        targetEntityType: 'user',
        targetEntityId: impPayload.sub,
        beforeValue: {
          sessionId: impPayload.session_id,
          targetUserUuid: impPayload.sub,
        },
      });
    }

    const response = successResponse({ success: true });

    // Clear the impersonation cookie
    response.cookies.set('imp_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
