/**
 * Public Company Info Endpoint
 * GET /api/v1/public/company/[slug] - Get company info by slug (no auth required)
 */

import { eq } from 'drizzle-orm';
import { db, companies, marketplaceListings } from '@schedulebox/database';
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
 * GET /api/v1/public/company/[slug]
 * Public endpoint - no authentication required
 * Returns company information with marketplace listing data
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

    // Get marketplace listing for this company
    const [listing] = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.companyId, company.id))
      .limit(1);

    // Extract settings from company.settings JSONB
    const settings = (company.settings as Record<string, unknown>) || {};
    const logoUrl = settings.logoUrl as string | undefined;
    const primaryColor = settings.primaryColor as string | undefined;

    // Build response (use marketplace listing for description/address if available)
    const response = {
      uuid: company.uuid,
      name: company.name,
      slug: company.slug,
      description: listing?.description || company.description || '',
      logoUrl: logoUrl || company.logoUrl || null,
      primaryColor: primaryColor || '#3B82F6',
      address: listing
        ? {
            street: listing.addressStreet || null,
            city: listing.addressCity || null,
            zip: listing.addressZip || null,
            country: company.addressCountry,
          }
        : {
            street: company.addressStreet || null,
            city: company.addressCity || null,
            zip: company.addressZip || null,
            country: company.addressCountry,
          },
      averageRating: listing?.averageRating ? parseFloat(listing.averageRating) : 0,
      reviewCount: listing?.reviewCount || 0,
      images: listing?.images || [],
      category: listing?.category || null,
      priceRange: listing?.priceRange || null,
      website: company.website || null,
      phone: company.phone || null,
      email: company.email || null,
    };

    return successResponse(response);
  },
});
