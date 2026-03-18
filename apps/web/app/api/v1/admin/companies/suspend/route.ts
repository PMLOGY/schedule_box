/**
 * POST /api/v1/admin/companies/suspend
 *
 * Suspend or unsuspend a company.
 *
 * Security:
 * - Admin role only
 * - Suspend requires non-empty reason
 * - Writes audit log with before/after state
 *
 * Body: { companyUuid: string, action: 'suspend' | 'unsuspend', reason?: string }
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, companies, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/admin/audit';

const suspendSchema = z.object({
  companyUuid: z.string().uuid(),
  action: z.enum(['suspend', 'unsuspend']),
  reason: z.string().optional(),
});

export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: suspendSchema,
  handler: async ({ req, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    if (body.action === 'suspend' && (!body.reason || body.reason.trim() === '')) {
      throw new ForbiddenError('A reason is required when suspending a company');
    }

    // Fetch company
    const [company] = await db
      .select({
        id: companies.id,
        uuid: companies.uuid,
        name: companies.name,
        suspendedAt: companies.suspendedAt,
        suspendedReason: companies.suspendedReason,
      })
      .from(companies)
      .where(eq(companies.uuid, body.companyUuid))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const beforeValue = {
      suspendedAt: company.suspendedAt?.toISOString() ?? null,
      suspendedReason: company.suspendedReason ?? null,
    };

    let afterValue: { suspendedAt: string | null; suspendedReason: string | null };

    if (body.action === 'suspend') {
      const now = new Date();
      await db
        .update(companies)
        .set({
          suspendedAt: now,
          suspendedReason: body.reason!.trim(),
          updatedAt: now,
        })
        .where(eq(companies.uuid, body.companyUuid));

      afterValue = {
        suspendedAt: now.toISOString(),
        suspendedReason: body.reason!.trim(),
      };
    } else {
      const now = new Date();
      await db
        .update(companies)
        .set({
          suspendedAt: null,
          suspendedReason: null,
          updatedAt: now,
        })
        .where(eq(companies.uuid, body.companyUuid));

      afterValue = { suspendedAt: null, suspendedReason: null };
    }

    // Fetch admin internal ID for audit log
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (adminRecord) {
      await writeAuditLog({
        req: req as NextRequest,
        adminUuid: user.sub,
        adminId: adminRecord.id,
        actionType: body.action === 'suspend' ? 'company_suspended' : 'company_unsuspended',
        targetEntityType: 'company',
        targetEntityId: body.companyUuid,
        beforeValue,
        afterValue,
        metadata: { companyName: company.name, action: body.action },
      });
    }

    return successResponse({
      companyUuid: body.companyUuid,
      action: body.action,
      suspendedAt: afterValue.suspendedAt,
      suspendedReason: afterValue.suspendedReason,
    });
  },
});
