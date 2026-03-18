'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Store, Star, Search } from 'lucide-react';
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
  useMarketplaceListings,
  useMyListing,
  useUpdateMyListing,
  type MarketplaceListing,
} from '@/hooks/use-marketplace-query';

// ============================================================================
// TYPES
// ============================================================================

type TabValue = 'browse' | 'myListing';

// ============================================================================
// LISTING CARD
// ============================================================================

function ListingCard({
  listing,
  t,
}: {
  listing: MarketplaceListing;
  t: ReturnType<typeof useTranslations<'marketplace'>>;
}) {
  return (
    <Card variant="glass" className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {listing.title || listing.company_name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{listing.company_name}</p>
        </div>
        {listing.category && (
          <Badge variant="secondary" className="shrink-0">
            {listing.category}
          </Badge>
        )}
      </div>

      {listing.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {listing.rating != null && listing.rating > 0 ? (
            <>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{listing.rating?.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({listing.review_count})</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{t('noRating')}</span>
          )}
        </div>
        {listing.slug && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/${listing.slug}`} target="_blank" rel="noopener noreferrer">
              {t('viewProfile')}
            </a>
          </Button>
        )}
      </div>
    </Card>
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

  // Initialize form from data once loaded
  const listing = myListing as MarketplaceListing | null;
  const form = formData ?? {
    title: listing?.title || '',
    description: listing?.description || '',
    category: listing?.category || '',
    is_visible: listing?.is_visible ?? true,
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...(prev ?? {
        title: listing?.title || '',
        description: listing?.description || '',
        category: listing?.category || '',
        is_visible: listing?.is_visible ?? true,
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

  const [activeTab, setActiveTab] = useState<TabValue>('browse');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: listingsData, isLoading: listingsLoading } = useMarketplaceListings(
    searchQuery ? { search: searchQuery } : {},
  );

  const listings =
    (listingsData as { data?: MarketplaceListing[] })?.data ??
    (Array.isArray(listingsData) ? (listingsData as MarketplaceListing[]) : []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader title={t('title')} description={t('description')} />

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'browse'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('browse')}
        >
          {t('tabs.browse')}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'myListing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('myListing')}
        >
          {t('tabs.myListing')}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
            />
          </div>

          {/* Listings Grid */}
          {listingsLoading ? (
            <div className="text-center py-12 text-muted-foreground">{tCommon('loading')}</div>
          ) : listings.length === 0 ? (
            <EmptyState icon={Store} title={t('emptyTitle')} description={t('emptyDescription')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} t={t} />
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
