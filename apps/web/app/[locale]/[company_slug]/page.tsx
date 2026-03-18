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
import { Star, MapPin, Clock, Phone, Mail, Globe, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { sanitizeText } from '@/lib/security/sanitize';

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
// HELPERS
// ============================================================================

const LOCALE_MAP: Record<string, string> = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  en: 'en-US',
};

function formatPrice(price: string, currency: string, locale: string): string {
  const intlLocale = LOCALE_MAP[locale] || locale;
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currency || 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parseFloat(price));
}

/**
 * Sanitize an image URL — only allow http/https protocols to prevent XSS via
 * javascript: or data: URIs in user-supplied image arrays.
 */
function sanitizeImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

// ============================================================================
// SEO METADATA
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { company_slug: slug, locale } = await params;

  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (!company) {
    return { title: 'Company not found' };
  }

  const [listing] = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.companyId, company.id))
    .limit(1);

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

export default async function PublicCompanyPage({ params }: PageProps) {
  const { company_slug: slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicCompany' });

  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
  });

  if (!company) {
    notFound();
  }

  const [listing] = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.companyId, company.id))
    .limit(1);

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

  const averageRating = listing?.averageRating ? parseFloat(listing.averageRating) : 0;
  const reviewCount = listing?.reviewCount || 0;

  const address = listing
    ? { street: listing.addressStreet, city: listing.addressCity, zip: listing.addressZip }
    : { street: company.addressStreet, city: company.addressCity, zip: company.addressZip };

  // Sanitized description for display
  const companyDescription = sanitizeText(listing?.description || company.description || '');

  // Photo gallery — validate each URL (user-supplied)
  const galleryImages: string[] = (listing?.images ?? [])
    .map((url) => sanitizeImageUrl(url))
    .filter((url): url is string => url !== null);

  // Map coordinates
  const lat = listing?.latitude ? parseFloat(listing.latitude) : null;
  const lng = listing?.longitude ? parseFloat(listing.longitude) : null;
  const hasMap = lat !== null && lng !== null;
  // Pre-compute OSM embed src to avoid non-null assertions in JSX
  const mapSrc =
    lat !== null && lng !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
      : '';

  // Featured badge
  const isFeatured = listing?.featured === true;

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
        ? { '@type': 'AggregateRating', ratingValue: averageRating, reviewCount }
        : undefined,
    telephone: company.phone,
    url: company.website,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-8">
        {/* Hero Section */}
        <Card className="border-white/40 bg-white/60 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-white/5">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {company.name}
                  </h1>
                  {isFeatured && (
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 text-foreground px-3 py-1 rounded-full text-sm font-medium">
                      <BadgeCheck className="w-4 h-4 text-blue-400" />
                      {t('featured')}
                    </span>
                  )}
                </div>
                {companyDescription && (
                  <p className="text-base text-muted-foreground max-w-2xl">{companyDescription}</p>
                )}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(averageRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {averageRating.toFixed(1)} ({t('reviewCount', { count: reviewCount })})
                    </span>
                  </div>
                )}
              </div>
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-20 h-20 rounded-xl object-contain ml-6 ring-1 ring-black/5 dark:ring-white/10"
                />
              )}
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
                asChild
              >
                <Link href={`/${locale}/${slug}/book`}>{t('book')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery Section — only when images are available */}
        {galleryImages.length > 0 && (
          <section aria-label={t('photos')}>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-5">
              {t('photos')}
            </h2>
            <div className="overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {galleryImages.map((src, idx) => (
                  <div
                    key={idx}
                    className="snap-start shrink-0 w-64 h-48 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <img
                      src={src}
                      alt={`${company.name} – ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Services Section */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-5">
            {t('services')}
          </h2>
          {companyServices.length === 0 ? (
            <p className="text-muted-foreground">{t('noServices')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyServices.map((service) => (
                <Card
                  key={service.id}
                  className="border-white/40 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow dark:border-white/10 dark:bg-white/5"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {service.name}
                        </h3>
                        {service.category && (
                          <p className="text-sm text-muted-foreground">{service.category.name}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-primary ml-4 whitespace-nowrap">
                        {formatPrice(service.price, service.currency || 'CZK', locale)}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {sanitizeText(service.description)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{service.durationMinutes} min</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/${locale}/${slug}/book?service=${service.uuid}`}>
                          {t('book')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Map Embed Section — only when coordinates are available */}
        {hasMap && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-5">
              {t('location')}
            </h2>
            <Card className="border-white/40 bg-white/60 backdrop-blur-xl shadow-sm dark:border-white/10 dark:bg-white/5 overflow-hidden">
              <iframe
                title={`${company.name} ${t('location')}`}
                src={mapSrc}
                className="w-full h-48 border-0"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </Card>
          </section>
        )}

        {/* Reviews Section */}
        {companyReviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('reviews')}</h2>
              {reviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({t('reviewCount', { count: reviewCount })})
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {companyReviews.map((review) => {
                const nameParts = review.customerName?.split(' ') || [];
                let displayName = t('verifiedCustomer');
                if (nameParts.length > 1) {
                  displayName = `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
                } else if (nameParts.length === 1 && nameParts[0]) {
                  displayName = nameParts[0];
                }

                return (
                  <Card
                    key={review.uuid}
                    className="border-white/40 bg-white/60 backdrop-blur-xl shadow-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-foreground">{displayName}</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString(
                            LOCALE_MAP[locale] || locale,
                          )}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground/80 mb-2">
                          {sanitizeText(review.comment)}
                        </p>
                      )}
                      {review.reply && (
                        <div className="mt-3 pl-4 border-l-2 border-primary/50">
                          <p className="text-sm font-semibold text-foreground/70">
                            {t('ownerReply')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {sanitizeText(review.reply)}
                          </p>
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
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-5">
              {t('contact')}
            </h2>
            <Card className="border-white/40 bg-white/60 backdrop-blur-xl shadow-sm dark:border-white/10 dark:bg-white/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {address.street && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-foreground">{address.street}</p>
                        <p className="text-muted-foreground">
                          {address.zip} {address.city}
                        </p>
                      </div>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <span className="text-sm text-muted-foreground mr-2">{t('phone')}:</span>
                        <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                          {company.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <span className="text-sm text-muted-foreground mr-2">{t('email')}:</span>
                        <a
                          href={`mailto:${company.email}`}
                          className="text-primary hover:underline"
                        >
                          {company.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <span className="text-sm text-muted-foreground mr-2">{t('web')}:</span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {company.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Sticky Book Now — mobile CTA footer */}
        <div className="sticky bottom-4 flex justify-center md:hidden">
          <Button
            size="lg"
            className="shadow-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-3 rounded-2xl font-semibold backdrop-blur-sm"
            asChild
          >
            <Link href={`/${locale}/${slug}/book`}>{t('book')}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
