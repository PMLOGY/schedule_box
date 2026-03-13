/**
 * Public Company Reviews Endpoint
 * GET /api/v1/public/company/[slug]/reviews - Get published reviews for a company (no auth required)
 */

import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, companies, reviews, customers } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';

// Params schema for slug validation
const companySlugParamSchema = z.object({
  slug: z.string().min(1),
});

type CompanySlugParam = z.infer<typeof companySlugParamSchema>;

// Query schema for pagination
const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * GET /api/v1/public/company/[slug]/reviews
 * Public endpoint - no authentication required
 * Returns published reviews with aggregated rating data
 */
export const GET = createRouteHandler<undefined, CompanySlugParam>({
  requiresAuth: false,
  paramsSchema: companySlugParamSchema,
  handler: async ({ req, params }) => {
    const { slug } = params;

    // Find company by slug
    const company = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });

    if (!company) {
      throw new NotFoundError(`Company not found: ${slug}`);
    }

    // Parse query parameters
    const query = validateQuery(reviewQuerySchema, req);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Get published reviews with customer data
    const reviewsList = await db
      .select({
        uuid: reviews.uuid,
        rating: reviews.rating,
        comment: reviews.comment,
        reply: reviews.reply,
        repliedAt: reviews.repliedAt,
        createdAt: reviews.createdAt,
        customerName: customers.name,
      })
      .from(reviews)
      .innerJoin(customers, eq(reviews.customerId, customers.id))
      .where(
        and(
          eq(reviews.companyId, company.id),
          eq(reviews.isPublished, true),
          isNull(reviews.deletedAt),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, company.id),
          eq(reviews.isPublished, true),
          isNull(reviews.deletedAt),
        ),
      );

    const total = countResult?.count || 0;

    // Get rating distribution
    const ratingDistribution = await db
      .select({
        rating: reviews.rating,
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, company.id),
          eq(reviews.isPublished, true),
          isNull(reviews.deletedAt),
        ),
      )
      .groupBy(reviews.rating);

    // Calculate average rating
    const [avgResult] = await db
      .select({
        average: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, company.id),
          eq(reviews.isPublished, true),
          isNull(reviews.deletedAt),
        ),
      );

    const averageRating = avgResult?.average ? parseFloat(Number(avgResult.average).toFixed(2)) : 0;

    // Format rating distribution (ensure all ratings 1-5 are present)
    const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((item) => {
      distributionMap[item.rating] = item.count;
    });

    // Anonymize customer names (first name + last initial)
    const formattedReviews = reviewsList.map((review) => {
      const nameParts = review.customerName?.split(' ') || ['Anonymous'];
      let anonymizedName = 'Verified customer';
      if (nameParts.length > 1) {
        anonymizedName = `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
      } else if (nameParts.length === 1) {
        anonymizedName = nameParts[0];
      }

      return {
        uuid: review.uuid,
        rating: review.rating,
        comment: review.comment || '',
        reply: review.reply || null,
        repliedAt: review.repliedAt,
        createdAt: review.createdAt,
        customerName: anonymizedName,
      };
    });

    // Return paginated response with aggregates in meta
    const totalPages = Math.ceil(total / limit);

    // Build meta object with extra fields for aggregates
    const meta = {
      page,
      limit,
      total,
      total_pages: totalPages,
      // Additional aggregate data
      averageRating,
      reviewCount: total,
      ratingDistribution: distributionMap,
    };

    // Return using NextResponse.json directly to include extra meta fields
    return NextResponse.json({ data: formattedReviews, meta });
  },
});
