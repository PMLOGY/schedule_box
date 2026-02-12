/**
 * Review Reply Endpoint
 * POST /api/v1/reviews/[id]/reply - Owner/admin replies to a review
 */

import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, reviews } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { reviewReplySchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';

// Param schema for review UUID
const reviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review ID format'),
});

/**
 * POST /api/v1/reviews/[id]/reply
 * Owner/admin replies to a review
 * Also auto-approves pending reviews
 */
export const POST = createRouteHandler({
  paramsSchema: reviewIdParamSchema,
  bodySchema: reviewReplySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, params, user }) => {
    const reviewUuid = params.id;
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find review by UUID
    const [existingReview] = await db
      .select({ id: reviews.id, isPublished: reviews.isPublished })
      .from(reviews)
      .where(
        and(eq(reviews.uuid, reviewUuid), eq(reviews.companyId, companyId), isNull(reviews.deletedAt)),
      )
      .limit(1);

    if (!existingReview) {
      throw new NotFoundError('Review not found');
    }

    // Update review: set reply, repliedAt, and auto-approve if pending
    const [updated] = await db
      .update(reviews)
      .set({
        reply: body.reply,
        repliedAt: new Date(),
        isPublished: true, // Auto-approve pending reviews when owner replies
        updatedAt: new Date(),
      })
      .where(eq(reviews.uuid, reviewUuid))
      .returning({
        uuid: reviews.uuid,
        rating: reviews.rating,
        comment: reviews.comment,
        reply: reviews.reply,
        repliedAt: reviews.repliedAt,
        isPublished: reviews.isPublished,
        updatedAt: reviews.updatedAt,
      });

    return successResponse({
      id: updated.uuid,
      rating: updated.rating,
      comment: updated.comment,
      reply: updated.reply,
      replied_at: updated.repliedAt?.toISOString(),
      is_published: updated.isPublished,
      updated_at: updated.updatedAt?.toISOString(),
    });
  },
});
