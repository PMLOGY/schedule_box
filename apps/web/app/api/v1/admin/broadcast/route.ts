/**
 * Admin Broadcast API
 * GET  /api/v1/admin/broadcast  — List broadcasts (supports ?active=true, ?current=true)
 * POST /api/v1/admin/broadcast  — Create a new broadcast
 *
 * Broadcasts allow platform admins to send email + in-app messages to all (or
 * plan-filtered) active non-suspended companies.
 *
 * Authorization: admin role only.
 */

import { NextResponse } from 'next/server';
import { eq, isNull, gte, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, platformBroadcasts, companies, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError, ValidationError } from '@schedulebox/shared';
import { writeAuditLog } from '@/lib/admin/audit';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const AUDIENCE_VALUES = ['all', 'free', 'essential', 'growth', 'ai_powered'] as const;

const createBroadcastSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be ≤ 1000 characters'),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO date string' }),
  audience: z.enum(AUDIENCE_VALUES, { errorMap: () => ({ message: 'Invalid audience value' }) }),
  confirmCount: z
    .number({ invalid_type_error: 'confirmCount must be a number' })
    .int()
    .nonnegative('confirmCount must be a non-negative integer'),
});

// ---------------------------------------------------------------------------
// GET — list broadcasts
// ---------------------------------------------------------------------------

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user, req }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('active') === 'true';
    const currentOnly = url.searchParams.get('current') === 'true';

    let query;

    if (currentOnly) {
      // In-app banner: broadcasts that have been sent within the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query = db
        .select()
        .from(platformBroadcasts)
        .where(
          and(
            sql`${platformBroadcasts.sentAt} IS NOT NULL`,
            gte(platformBroadcasts.sentAt!, sevenDaysAgo),
          ),
        )
        .orderBy(sql`${platformBroadcasts.sentAt} DESC`);
    } else if (activeOnly) {
      // Admin management view: unsent/scheduled broadcasts
      query = db
        .select()
        .from(platformBroadcasts)
        .where(isNull(platformBroadcasts.sentAt))
        .orderBy(sql`${platformBroadcasts.scheduledAt} ASC`);
    } else {
      // All broadcasts newest first
      query = db
        .select()
        .from(platformBroadcasts)
        .orderBy(sql`${platformBroadcasts.createdAt} DESC`);
    }

    const broadcasts = await query;
    return successResponse(broadcasts);
  },
});

// ---------------------------------------------------------------------------
// POST — create broadcast
// ---------------------------------------------------------------------------

export const POST = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user, req }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createBroadcastSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { message, scheduledAt, audience, confirmCount } = parsed.data;

    // Validate scheduledAt is in the future
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new ValidationError('scheduledAt must be in the future');
    }

    // Rate limit: allow at most one broadcast creation per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [recentBroadcast] = await db
      .select({ id: platformBroadcasts.id })
      .from(platformBroadcasts)
      .where(gte(platformBroadcasts.createdAt, tenMinutesAgo))
      .limit(1);

    if (recentBroadcast) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message:
              'A broadcast was already created within the last 10 minutes. Please wait before creating another.',
          },
        },
        { status: 429 },
      );
    }

    // Count matching target companies for confirmation
    const targetCount = await countTargetCompanies(audience);

    if (confirmCount !== targetCount) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFIRM_COUNT_MISMATCH',
            message: `Confirmation count mismatch. Expected ${targetCount}, got ${confirmCount}. Query the target count and confirm again.`,
          },
          targetCount,
        },
        { status: 409 },
      );
    }

    // Resolve admin numeric ID from UUID (sub claim)
    const adminUuid = user.sub;
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, adminUuid))
      .limit(1);
    const adminId = adminRecord?.id ?? 0;

    // Insert broadcast
    const [created] = await db
      .insert(platformBroadcasts)
      .values({
        message,
        scheduledAt: scheduledDate,
        audience,
        createdBy: adminId,
      })
      .returning();

    await writeAuditLog({
      req,
      adminId,
      adminUuid,
      actionType: 'broadcast.created',
      targetEntityType: 'platform_broadcast',
      targetEntityId: String(created.id),
      afterValue: { audience, scheduledAt, messagePreview: message.slice(0, 100) },
    });

    return successResponse(created, 201);
  },
});

// ---------------------------------------------------------------------------
// Helper — count active non-suspended companies matching audience
// ---------------------------------------------------------------------------

async function countTargetCompanies(audience: (typeof AUDIENCE_VALUES)[number]): Promise<number> {
  const baseCondition = and(eq(companies.isActive, true), isNull(companies.suspendedAt));

  const audienceCondition =
    audience === 'all'
      ? baseCondition
      : and(baseCondition, eq(companies.subscriptionPlan, audience));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companies)
    .where(audienceCondition);

  return row?.count ?? 0;
}
