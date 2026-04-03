/**
 * Embed Widget Page
 *
 * Renders company services in a compact iframe-friendly layout.
 * "Book" buttons open the full public booking page in a new tab.
 */

import { db, companies, marketplaceListings, services } from '@schedulebox/database';
import { eq, and, isNull } from 'drizzle-orm';
import { WidgetContent } from './widget-content';

export const dynamic = 'force-dynamic';

interface EmbedPageProps {
  params: Promise<{ company_slug: string }>;
  searchParams: Promise<{ theme?: string; locale?: string; parent_origin?: string }>;
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { company_slug } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const theme = resolvedSearchParams.theme || 'light';
  const locale = resolvedSearchParams.locale || 'cs';
  const parentOrigin = resolvedSearchParams.parent_origin || null;

  // Fetch company
  const [company] = await db
    .select({
      id: companies.id,
      uuid: companies.uuid,
      name: companies.name,
      slug: companies.slug,
      settings: companies.settings,
    })
    .from(companies)
    .where(eq(companies.slug, company_slug))
    .limit(1);

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Company not found
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            The requested company does not exist or is not available.
          </p>
        </div>
      </div>
    );
  }

  // Fetch marketplace listing for logo and rating
  const [listing] = await db
    .select({
      images: marketplaceListings.images,
      averageRating: marketplaceListings.averageRating,
      reviewCount: marketplaceListings.reviewCount,
    })
    .from(marketplaceListings)
    .where(eq(marketplaceListings.companyId, company.id))
    .limit(1);

  // Fetch active services
  const activeServices = await db
    .select({
      uuid: services.uuid,
      name: services.name,
      description: services.description,
      duration: services.durationMinutes,
      price: services.price,
      currency: services.currency,
    })
    .from(services)
    .where(
      and(
        eq(services.companyId, company.id),
        eq(services.isActive, true),
        isNull(services.deletedAt),
      ),
    )
    .orderBy(services.name);

  const settings = (company.settings as Record<string, unknown>) || {};
  const primaryColor = (settings.primaryColor as string) || '#3B82F6';
  const logo = listing?.images?.[0] || null;
  const averageRating = listing?.averageRating ? parseFloat(String(listing.averageRating)) : 0;
  const reviewCount = listing?.reviewCount || 0;

  return (
    <WidgetContent
      company={{
        name: company.name,
        slug: company.slug,
        logo,
        primaryColor,
        averageRating,
        reviewCount,
      }}
      services={activeServices.map((service) => ({
        uuid: service.uuid,
        name: service.name,
        description: service.description || '',
        duration: service.duration,
        price: String(service.price || '0'),
        currency: service.currency || 'CZK',
      }))}
      locale={locale}
      theme={theme}
      parentOrigin={parentOrigin}
    />
  );
}
