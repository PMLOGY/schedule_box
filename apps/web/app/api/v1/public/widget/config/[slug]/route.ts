/**
 * Widget Configuration API
 *
 * GET /api/v1/public/widget/config/[slug]
 * Returns company branding and active services for widget display.
 * No authentication required (public endpoint).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { db, companies, marketplaceListings, services } from '@schedulebox/database';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface WidgetConfigResponse {
  companyName: string;
  companySlug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  services: Array<{
    uuid: string;
    name: string;
    duration: number;
    price: string;
    currency: string;
  }>;
  locale: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Company slug is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        },
      );
    }

    // Find company by slug
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        },
      );
    }

    // Query marketplace listing for branding
    const [listing] = await db
      .select({
        images: marketplaceListings.images,
      })
      .from(marketplaceListings)
      .where(eq(marketplaceListings.companyId, company.id))
      .limit(1);

    // Query active services
    const activeServices = await db
      .select({
        uuid: services.uuid,
        name: services.name,
        duration: services.duration,
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

    // Extract branding from company settings
    const settings = (company.settings as Record<string, unknown>) || {};
    const primaryColor = (settings.primaryColor as string) || '#3B82F6'; // Default ScheduleBox blue
    const secondaryColor = (settings.secondaryColor as string) || '#22C55E'; // Default green
    const logo = listing?.images?.[0] || null;

    // Build response
    const config: WidgetConfigResponse = {
      companyName: company.name,
      companySlug: company.slug,
      logo,
      primaryColor,
      secondaryColor,
      services: activeServices.map((service) => ({
        uuid: service.uuid,
        name: service.name,
        duration: service.duration,
        price: service.price || '0',
        currency: service.currency || 'CZK',
      })),
      locale: (settings.defaultLocale as string) || 'cs',
    };

    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    });
  } catch (error) {
    console.error('Widget config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  }
}

// Handle CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  );
}
