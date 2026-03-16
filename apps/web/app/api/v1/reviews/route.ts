/**
 * Review List and Create Endpoints
 * GET  /api/v1/reviews - List reviews with pagination, rating filter, status filter
 * POST /api/v1/reviews - Create new review with auto-moderation
 */

import { eq, and, gte, isNull, sql } from 'drizzle-orm';
import { db, reviews, bookings, customers, services, users } from '@schedulebox/database';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  type PaginationMeta,
} from '@schedulebox/shared';
import { reviewCreateSchema, reviewListQuerySchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse, paginatedResponse } from '@/lib/utils/response';
import { createReviewCreatedEvent, publishEvent } from '@schedulebox/events';
import { sanitizeText } from '@/lib/security/sanitize';

/**
 * GET /api/v1/reviews
 * List reviews with pagination, rating filter, and status filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(reviewListQuerySchema, req);
    const { page = 1, limit = 20, rating_min, status } = query;

    // Also check for exact rating param (not in schema, parsed manually)
    const ratingExact = req.nextUrl.searchParams.get('rating');

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped + not deleted)
    const baseConditions = [eq(reviews.companyId, companyId), isNull(reviews.deletedAt)];

    // Add rating filter — exact match takes priority over min
    if (ratingExact) {
      const parsed = parseInt(ratingExact, 10);
      if (parsed >= 1 && parsed <= 5) {
        baseConditions.push(eq(reviews.rating, parsed));
      }
    } else if (rating_min !== undefined) {
      baseConditions.push(gte(reviews.rating, rating_min));
    }

    // Add status filter
    // reviews table has isPublished boolean, not a status column
    // Map: 'approved' = isPublished true, 'pending' = isPublished false
    if (status === 'approved') {
      baseConditions.push(eq(reviews.isPublished, true));
    } else if (status === 'pending') {
      baseConditions.push(eq(reviews.isPublished, false));
    }
    // Note: 'rejected' would be deletedAt IS NOT NULL, but we already filter those out

    // Query reviews with JOINs for customer and service names
    const data = await db
      .select({
        id: reviews.id,
        uuid: reviews.uuid,
        companyId: reviews.companyId,
        customerId: reviews.customerId,
        customerName: customers.name,
        bookingId: reviews.bookingId,
        serviceId: reviews.serviceId,
        serviceName: services.name,
        employeeId: reviews.employeeId,
        rating: reviews.rating,
        comment: reviews.comment,
        redirectedTo: reviews.redirectedTo,
        isPublished: reviews.isPublished,
        reply: reviews.reply,
        repliedAt: reviews.repliedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .leftJoin(services, eq(reviews.serviceId, services.id))
      .where(and(...baseConditions))
      .orderBy(sql`${reviews.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(and(...baseConditions));

    const totalCount = countResult.count;

    // Map to response format (use UUID, not SERIAL id)
    const responseData = data.map((review) => ({
      id: review.uuid,
      customer_id: review.customerId,
      customer_name: review.customerName,
      booking_id: review.bookingId,
      service_id: review.serviceId,
      service_name: review.serviceName,
      employee_id: review.employeeId,
      rating: review.rating,
      comment: review.comment,
      redirected_to: review.redirectedTo,
      is_published: review.isPublished,
      reply: review.reply,
      replied_at: review.repliedAt?.toISOString(),
      created_at: review.createdAt?.toISOString(),
      updated_at: review.updatedAt?.toISOString(),
    }));

    // Company-wide aggregates for KPI cards (unaffected by filters)
    const companyConditions = [eq(reviews.companyId, companyId), isNull(reviews.deletedAt)];
    const now = new Date();
    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [agg] = await db
      .select({
        avg_rating: sql<string>`coalesce(round(avg(${reviews.rating})::numeric, 1), 0)::text`,
        total_reviews: sql<number>`count(*)::int`,
        this_month: sql<number>`count(*) filter (where ${reviews.createdAt} >= ${startOfMonthStr}::timestamptz)::int`,
        replied_count: sql<number>`count(*) filter (where ${reviews.reply} is not null)::int`,
      })
      .from(reviews)
      .where(and(...companyConditions));

    const responseRate =
      agg.total_reviews > 0 ? Math.round((agg.replied_count / agg.total_reviews) * 100) : 0;

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    const reviewMeta: PaginationMeta & { aggregates: object } = {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
      aggregates: {
        avg_rating: parseFloat(agg.avg_rating),
        total_reviews: agg.total_reviews,
        this_month: agg.this_month,
        response_rate: responseRate,
      },
    };
    return paginatedResponse(responseData, reviewMeta as unknown as PaginationMeta);
  },
});

/**
 * POST /api/v1/reviews
 * Create new review with auto-moderation and duplicate prevention
 */
export const POST = createRouteHandler({
  bodySchema: reviewCreateSchema,
  requiresAuth: true,
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';

    // Find user's internal ID from UUID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!userRecord) {
      throw new ForbiddenError('User not found');
    }

    // Find user's customer record (reviews are created by customers)
    const [customerRecord] = await db
      .select({ id: customers.id, companyId: customers.companyId })
      .from(customers)
      .where(eq(customers.userId, userRecord.id))
      .limit(1);

    if (!customerRecord) {
      throw new ForbiddenError('Customer record not found for user');
    }

    // Resolve booking by UUID
    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        status: bookings.status,
        companyId: bookings.companyId,
        serviceId: bookings.serviceId,
        employeeId: bookings.employeeId,
      })
      .from(bookings)
      .where(eq(bookings.uuid, body.bookingUuid))
      .limit(1);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Validate booking belongs to customer
    if (booking.customerId !== customerRecord.id) {
      throw new ForbiddenError('Booking does not belong to this customer');
    }

    // Validate booking status is completed
    if (booking.status !== 'completed') {
      throw new ForbiddenError('Only completed bookings can be reviewed');
    }

    // Check for duplicate review
    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, booking.id))
      .limit(1);

    if (existingReview) {
      throw new ConflictError('Review already exists for this booking', 'DUPLICATE_REVIEW');
    }

    // Auto-moderation logic
    // 1. Check if first-time reviewer
    const [reviewCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(eq(reviews.customerId, customerRecord.id));

    const isFirstReview = reviewCount.count === 0;

    // 2. Determine if needs moderation
    const hasShortComment = body.comment && body.comment.length < 20;
    const needsModeration = body.rating <= 3 || isFirstReview || hasShortComment;
    const isPublished = !needsModeration;

    // 3. Determine redirect behavior
    // High ratings (4-5) get external redirect suggestion, low ratings (1-3) stay internal
    const redirectedTo = body.rating >= 4 ? 'google' : 'internal';

    // Sanitize user-generated content before DB insert (SEC-02)
    const cleanComment = body.comment ? sanitizeText(body.comment) : body.comment;

    // Insert review
    const [review] = await db
      .insert(reviews)
      .values({
        companyId: booking.companyId,
        customerId: customerRecord.id,
        bookingId: booking.id,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        rating: body.rating,
        comment: cleanComment,
        isPublished,
        redirectedTo,
      })
      .returning();

    // Publish review.created event (fire-and-forget)
    try {
      const event = createReviewCreatedEvent({
        reviewUuid: review.uuid ?? '',
        companyId: review.companyId,
        customerId: review.customerId,
        bookingId: review.bookingId ?? 0,
        rating: review.rating,
        createdAt: review.createdAt?.toISOString() ?? new Date().toISOString(),
      });
      await publishEvent(event);
    } catch (error) {
      console.error('[Reviews] Failed to publish review.created event:', error);
    }

    // Return created review
    // If rating >= 4, include redirect URL placeholder (actual URL would come from company settings)
    const redirectUrl = body.rating >= 4 ? 'https://g.page/r/{PLACE_ID}/review' : null;

    return createdResponse({
      id: review.uuid,
      booking_id: booking.id,
      rating: review.rating,
      comment: review.comment,
      is_published: review.isPublished,
      redirected_to: review.redirectedTo,
      redirect_to: redirectUrl,
      needs_moderation: needsModeration,
      created_at: review.createdAt?.toISOString(),
    });
  },
});
