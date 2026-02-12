/**
 * Public Company Services Endpoint
 * GET /api/v1/public/company/[slug]/services - Get active services for a company (no auth required)
 */

import { eq, and, isNull, asc } from 'drizzle-orm';
import { db, companies, services, serviceCategories } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { NotFoundError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Params schema for slug validation
const companySlugParamSchema = z.object({
  slug: z.string().min(1),
});

type CompanySlugParam = z.infer<typeof companySlugParamSchema>;

/**
 * GET /api/v1/public/company/[slug]/services
 * Public endpoint - no authentication required
 * Returns active services for a company
 */
export const GET = createRouteHandler<undefined, CompanySlugParam>({
  requiresAuth: false,
  paramsSchema: companySlugParamSchema,
  handler: async ({ params }) => {
    const { slug } = params;

    // Find company by slug
    const company = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });

    if (!company) {
      throw new NotFoundError(`Company not found: ${slug}`);
    }

    // Query active services with categories
    const servicesList = await db.query.services.findMany({
      where: and(
        eq(services.companyId, company.id),
        eq(services.isActive, true),
        isNull(services.deletedAt),
      ),
      with: {
        category: true,
      },
      orderBy: [asc(serviceCategories.sortOrder), asc(services.sortOrder), asc(services.name)],
    });

    // Map to response format
    const response = servicesList.map((service) => ({
      uuid: service.uuid,
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: parseFloat(service.price),
      currency: service.currency,
      category: service.category
        ? {
            id: service.category.id,
            name: service.category.name,
          }
        : null,
      isOnline: service.isOnline,
      imageUrl: service.imageUrl || null,
    }));

    return successResponse(response);
  },
});
