'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Store,
  Star,
  Search,
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
  MapPin,
  X,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMarketplaceListings,
  useMyListing,
  useUpdateMyListing,
  type MarketplaceListing,
  type MarketplaceListingsParams,
} from '@/hooks/use-marketplace-query';

// ============================================================================
// TYPES
// ============================================================================

type TabValue = 'browse' | 'myListing';
type ViewMode = 'grid' | 'list';
type SortBy = 'rating' | 'distance' | 'name' | 'featured';

interface GeoPosition {
  lat: number;
  lng: number;
  radius_km: number;
}

const CATEGORIES = [
  'Health',
  'Beauty',
  'Automotive',
  'Education',
  'Fitness',
  'Restaurant',
  'Other',
];

// ============================================================================
// LISTING CARD (GRID VIEW)
// ============================================================================

function ListingCardGrid({
  listing,
  locale,
  t,
}: {
  listing: MarketplaceListing;
  locale: string;
  t: ReturnType<typeof useTranslations<'marketplace'>>;
}) {
  const router = useRouter();
  const ratingValue = listing.average_rating ? parseFloat(listing.average_rating) : null;
  return (
    <Card
      variant="glass"
      className="p-5 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
      onClick={() => listing.company_slug && router.push('/' + locale + '/' + listing.company_slug)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
            {listing.featured && (
              <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {t('featuredBadge')}
              </Badge>
            )}
            {listing.verified && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] py-0 px-1.5 text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
              >
                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                {t('verifiedBadge')}
              </Badge>
            )}
          </div>
          {listing.address_city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.address_city}
            </p>
          )}
        </div>
        {listing.category && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {listing.category}
          </Badge>
        )}
      </div>
      {listing.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {ratingValue !== null && ratingValue > 0 ? (
            <>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{ratingValue.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({listing.review_count})</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{t('noRating')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {listing.price_range && (
            <span className="text-xs text-muted-foreground font-medium">{listing.price_range}</span>
          )}
          {listing.distance !== null && listing.distance !== undefined && (
            <span className="text-xs text-muted-foreground">{listing.distance.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// LISTING ROW (LIST VIEW)
// ============================================================================

function ListingCardList({
  listing,
  locale,
  t,
}: {
  listing: MarketplaceListing;
  locale: string;
  t: ReturnType<typeof useTranslations<'marketplace'>>;
}) {
  const router = useRouter();
  const ratingValue = listing.average_rating ? parseFloat(listing.average_rating) : null;
  return (
    <Card
      variant="glass"
      className="p-4 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
      onClick={() => listing.company_slug && router.push('/' + locale + '/' + listing.company_slug)}
    >
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center">
          <Store className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
            {listing.featured && (
              <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {t('featuredBadge')}
              </Badge>
            )}
            {listing.verified && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] py-0 px-1.5 text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
              >
                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                {t('verifiedBadge')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {listing.category && (
              <Badge variant="secondary" className="text-xs">
                {listing.category}
              </Badge>
            )}
            {listing.address_city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {listing.address_city}
              </span>
            )}
            {ratingValue !== null && ratingValue > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {ratingValue.toFixed(1)} ({listing.review_count})
              </span>
            ) : (
              <span>{t('noRating')}</span>
            )}
            {listing.price_range && <span>{listing.price_range}</span>}
            {listing.distance !== null && listing.distance !== undefined && (
              <span>{listing.distance.toFixed(1)} km</span>
            )}
          </div>
          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{listing.description}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// FEATURED CAROUSEL
// ============================================================================

function FeaturedCarousel({
  listings,
  locale,
  t,
}: {
  listings: MarketplaceListing[];
  locale: string;
  t: ReturnType<typeof useTranslations<'marketplace'>>;
}) {
  const router = useRouter();
  if (listings.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t('featuredSection')}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {listings.map((listing) => {
          const rv = listing.average_rating ? parseFloat(listing.average_rating) : null;
          return (
            <div
              key={listing.id}
              className="w-[280px] shrink-0 snap-start cursor-pointer"
              onClick={() =>
                listing.company_slug && router.push('/' + locale + '/' + listing.company_slug)
              }
            >
              <Card
                variant="glass"
                className="p-5 h-full space-y-3 border border-primary/20 hover:border-primary/50 transition-all bg-gradient-to-br from-primary/5 to-transparent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
                    {listing.address_city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {listing.address_city}
                      </p>
                    )}
                  </div>
                  <Badge className="shrink-0 bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    {t('featuredBadge')}
                  </Badge>
                </div>
                {listing.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {listing.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  {listing.category && (
                    <Badge variant="secondary" className="text-xs">
                      {listing.category}
                    </Badge>
                  )}
                  {rv !== null && rv > 0 ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {rv.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ListingsSkeleton({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div
      className={
        viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'
      }
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          variant="glass"
          className={`animate-pulse ${viewMode === 'list' ? 'p-4' : 'p-5'}`}
        >
          {viewMode === 'grid' ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MY LISTING FORM
// ============================================================================

function MyListingForm({
  t,
  tCommon,
}: {
  t: ReturnType<typeof useTranslations<'marketplace'>>;
  tCommon: ReturnType<typeof useTranslations<'common'>>;
}) {
  const { data: myListing, isLoading } = useMyListing();
  const updateMutation = useUpdateMyListing();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    is_visible: boolean;
  } | null>(null);
  const listing = myListing as MarketplaceListing | null;
  const isVisibleValue = (listing as { is_visible?: boolean } | null)?.is_visible ?? true;
  const form = formData ?? {
    title: listing?.title || '',
    description: listing?.description || '',
    category: listing?.category || '',
    is_visible: isVisibleValue,
  };
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...(prev ?? {
        title: listing?.title || '',
        description: listing?.description || '',
        category: listing?.category || '',
        is_visible: isVisibleValue,
      }),
      [field]: value,
    }));
  };
  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      await updateMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        is_visible: form.is_visible,
      });
      toast.success(t('saveSuccess'));
    } catch {
      toast.error(t('saveError'));
    }
  };
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>;
  }
  return (
    <Card variant="glass" className="p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="listing-title">{t('form.title')} *</Label>
          <Input
            id="listing-title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={t('form.titlePlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="listing-description">{t('form.description')}</Label>
          <Textarea
            id="listing-description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
            rows={4}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="listing-category">{t('form.category')}</Label>
          <Input
            id="listing-category"
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder={t('form.categoryPlaceholder')}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="listing-visibility">{t('form.visibility')}</Label>
            <p className="text-xs text-muted-foreground">{t('form.visibilityHelp')}</p>
          </div>
          <Switch
            id="listing-visibility"
            checked={form.is_visible}
            onCheckedChange={(checked) => handleChange('is_visible', checked)}
          />
        </div>
        {updateMutation.isError && <p className="text-sm text-destructive">{t('saveError')}</p>}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!form.title.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? tCommon('loading') : t('form.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<TabValue>('browse');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [geo, setGeo] = useState<GeoPosition | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const queryParams: MarketplaceListingsParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(category ? { category } : {}),
    ...(city ? { city } : {}),
    ...(geo ? { lat: geo.lat, lng: geo.lng, radius_km: geo.radius_km } : {}),
    sort_by: sortBy,
    limit: 50,
  };

  const { data: listingsData, isLoading: listingsLoading } = useMarketplaceListings(queryParams);

  const allListings: MarketplaceListing[] =
    (listingsData as { data?: MarketplaceListing[] } | undefined)?.data ??
    (Array.isArray(listingsData) ? (listingsData as MarketplaceListing[]) : []);

  const featuredListings = allListings.filter((l) => l.featured);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, radius_km: 10 });
        setSortBy('distance');
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        toast.error('Could not get your location');
      },
    );
  }, []);

  const handleClearGeo = useCallback(() => {
    setGeo(null);
    if (sortBy === 'distance') setSortBy('rating');
  }, [sortBy]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b">
        {(['browse', 'myListing'] as TabValue[]).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search + Filter toggle + View toggle row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              {showFilters ? t('filtersHide') : t('filters')}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </Button>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-none border-0"
                onClick={() => setViewMode('grid')}
                title={t('viewGrid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-none border-0"
                onClick={() => setViewMode('list')}
                title={t('viewList')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Collapsible filter panel */}
          {showFilters && (
            <Card variant="glass" className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('filterCategory')}</Label>
                  <Select
                    value={category || '_all'}
                    onValueChange={(v) => setCategory(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('filterCategoryAll')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">{t('filterCategoryAll')}</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* City */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('filterCity')}</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('filterCityPlaceholder')}
                    className="h-9"
                  />
                </div>
                {/* Sort */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('sortBy')}</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">{t('sortRating')}</SelectItem>
                      <SelectItem value="distance" disabled={!geo}>
                        {t('sortDistance')}
                      </SelectItem>
                      <SelectItem value="featured">{t('sortFeatured')}</SelectItem>
                      <SelectItem value="name">{t('sortName')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Geo */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('filterRadius')}</Label>
                  {geo ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          {t('filterGeoActive')} &mdash; {geo.radius_km} km
                        </Badge>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={handleClearGeo}
                          title={t('filterClearGeo')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={geo.radius_km}
                        onChange={(e) =>
                          setGeo((g) => (g ? { ...g, radius_km: Number(e.target.value) } : g))
                        }
                        className="w-full h-1.5 accent-primary"
                      />
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 gap-1.5"
                      onClick={handleNearMe}
                      disabled={geoLoading}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {geoLoading ? tCommon('loading') : t('filterNearMe')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Featured Carousel */}
          {!listingsLoading && featuredListings.length > 0 && (
            <FeaturedCarousel listings={featuredListings} locale={locale} t={t} />
          )}

          {/* Results */}
          {listingsLoading ? (
            <ListingsSkeleton viewMode={viewMode} />
          ) : allListings.length === 0 ? (
            <EmptyState icon={Store} title={t('emptyTitle')} description={t('emptyDescription')} />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allListings.map((listing) => (
                <ListingCardGrid key={listing.id} listing={listing} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {allListings.map((listing) => (
                <ListingCardList key={listing.id} listing={listing} locale={locale} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Listing Tab */}
      {activeTab === 'myListing' && <MyListingForm t={t} tCommon={tCommon} />}
    </div>
  );
}
