import { notFound } from 'next/navigation';
import { type Metadata } from 'next';
import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  companies,
  services,
  reviews,
  customers,
  marketplaceListings,
} from '@schedulebox/database';
import { Star, MapPin, Clock, Euro } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface PageProps {
  params: Promise<{
    locale: string;
    company_slug: string;
  }>;
}

// ============================================================================
// SEO METADATA
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { company_slug: slug, locale } = await params;

  // Fetch company data for SEO
  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (!company) {
    return {
      title: 'Company not found',
    };
  }

  // Get marketplace listing
  const [listing] = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.companyId, company.id))
    .limit(1);

  // Get services for description
  const companyServices = await db.query.services.findMany({
    where: and(
      eq(services.companyId, company.id),
      eq(services.isActive, true),
      isNull(services.deletedAt),
    ),
    limit: 5,
  });

  const serviceNames = companyServices.map((s) => s.name).join(', ');
  const city = listing?.addressCity || company.addressCity || 'ScheduleBox';
  const description = listing?.description || company.description || '';

  return {
    title: `${company.name} - Online Rezervace | ${city}`,
    description:
      `Rezervujte si termín online u ${company.name}. ${serviceNames ? serviceNames + '.' : ''} ${description}`.slice(
        0,
        160,
      ),
    openGraph: {
      title: `${company.name} - Online Rezervace`,
      description: `Rezervujte si termín online u ${company.name}`,
      images:
        listing?.images?.[0] || company.logoUrl
          ? [listing?.images?.[0] || company.logoUrl].filter((img): img is string => !!img)
          : [],
      url: `https://schedulebox.cz/${locale}/${slug}`,
    },
    alternates: {
      canonical: `https://schedulebox.cz/${slug}`,
    },
  };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default async function PublicBookingPage({ params }: PageProps) {
  const { company_slug: slug, locale } = await params;

  // Fetch company data
  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (!company) {
    notFound();
  }

  // Get marketplace listing
  const [listing] = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.companyId, company.id))
    .limit(1);

  // Get services
  const companyServices = await db.query.services.findMany({
    where: and(
      eq(services.companyId, company.id),
      eq(services.isActive, true),
      isNull(services.deletedAt),
    ),
    with: {
      category: true,
    },
  });

  // Get published reviews
  const companyReviews = await db
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
    .limit(10);

  // Calculate average rating
  const averageRating = listing?.averageRating ? parseFloat(listing.averageRating) : 0;
  const reviewCount = listing?.reviewCount || 0;

  // Prepare address
  const address = listing
    ? {
        street: listing.addressStreet,
        city: listing.addressCity,
        zip: listing.addressZip,
      }
    : {
        street: company.addressStreet,
        city: company.addressCity,
        zip: company.addressZip,
      };

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    description: listing?.description || company.description,
    image: listing?.images?.[0] || company.logoUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      postalCode: address.zip,
      addressCountry: company.addressCountry || 'CZ',
    },
    aggregateRating:
      reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount: reviewCount,
          }
        : undefined,
    telephone: company.phone,
    url: company.website,
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-8">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{company.name}</CardTitle>
                {listing?.description && (
                  <CardDescription className="text-base">{listing.description}</CardDescription>
                )}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {averageRating.toFixed(1)} ({reviewCount}{' '}
                      {reviewCount === 1 ? 'recenze' : 'recenzí'})
                    </span>
                  </div>
                )}
              </div>
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-20 h-20 object-contain ml-4"
                />
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Services Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Naše služby</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyServices.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      {service.category && (
                        <p className="text-sm text-muted-foreground">{service.category.name}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{service.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <Euro className="w-4 h-4" />
                      <span>
                        {parseFloat(service.price).toFixed(0)} {service.currency}
                      </span>
                    </div>
                  </div>
                  <Link href={`/${locale}/bookings/new?service=${service.uuid}&company=${slug}`}>
                    <Button className="w-full">Rezervovat</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Reviews Section */}
        {companyReviews.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Recenze zákazníků</h2>
            <div className="space-y-4">
              {companyReviews.map((review) => {
                // Anonymize customer name
                const nameParts = review.customerName?.split(' ') || ['Anonymous'];
                let anonymizedName = 'Ověřený zákazník';
                if (nameParts.length > 1) {
                  anonymizedName = `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
                } else if (nameParts.length === 1) {
                  anonymizedName = nameParts[0];
                }

                return (
                  <Card key={review.uuid}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{anonymizedName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm mb-2">{review.comment}</p>}
                      {review.reply && (
                        <div className="mt-3 pl-4 border-l-2 border-primary">
                          <p className="text-sm font-semibold">Odpověď majitele:</p>
                          <p className="text-sm text-muted-foreground">{review.reply}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Contact/Location Section */}
        {(address.street || company.phone || company.email) && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Kontakt</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {address.street && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{address.street}</p>
                        <p>
                          {address.zip} {address.city}
                        </p>
                      </div>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Telefon:</span>
                      <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                        {company.phone}
                      </a>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Email:</span>
                      <a href={`mailto:${company.email}`} className="text-primary hover:underline">
                        {company.email}
                      </a>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Web:</span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
