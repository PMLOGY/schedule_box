'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useLoyaltyCards, useCreateCard, useLoyaltyProgram } from '@/hooks/use-loyalty-queries';
import { useCustomersQuery, type Customer } from '@/hooks/use-customers-query';
import { CreditCard, Plus, ChevronLeft, ChevronRight, Search, Check } from 'lucide-react';

// ============================================================================
// ISSUE CARD DIALOG
// ============================================================================

function IssueCardDialog({
  open,
  onOpenChange,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: ReturnType<typeof useTranslations<'loyaltyCards'>>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createCard = useCreateCard();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers based on search
  const { data: customersData, isLoading: searchLoading } = useCustomersQuery({
    search: debouncedSearch || undefined,
    limit: 10,
  });

  const customers = customersData?.data ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setDebouncedSearch('');
      setSelectedCustomer(null);
      setShowDropdown(false);
    }
  }, [open]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name + (customer.email ? ` (${customer.email})` : ''));
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    createCard.mutate(
      { customer_id: selectedCustomer.uuid },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('dialog.customerLabel')}</Label>
            <div className="relative" ref={dropdownRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCustomer(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={t('dialog.customerPlaceholder')}
                className="pl-9"
              />
              {showDropdown && searchQuery.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                  {searchLoading ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {t('dialog.searchingCustomers')}
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {t('dialog.noCustomersFound')}
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.uuid}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{customer.name}</p>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.email}
                            </p>
                          )}
                        </div>
                        {selectedCustomer?.uuid === customer.uuid && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('dialog.customerHint')}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" disabled={createCard.isPending || !selectedCustomer}>
              {createCard.isPending ? t('dialog.issuing') : t('dialog.issue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyCardsPage() {
  const t = useTranslations('loyaltyCards');
  const locale = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const limit = 20;

  const { data: program } = useLoyaltyProgram();
  const isStamps = program?.type === 'stamps';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchFilter), 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  const { data, isLoading } = useLoyaltyCards({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const cards = data?.data ?? [];
  const pagination = data?.meta;

  const handleRowClick = (cardUuid: string) => {
    router.push(`/${locale}/loyalty/cards/${cardUuid}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => setIssueDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('issueCard')}
          </Button>
        }
      />

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('search')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="mb-2 block text-sm">{t('searchLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('searchPlaceholder')}
                  className="pl-9"
                />
              </div>
            </div>
            {searchFilter && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchFilter('');
                  setPage(1);
                }}
              >
                {t('clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">{t('empty')}</p>
              <p className="text-sm text-muted-foreground">
                {searchFilter ? t('emptyFiltered') : t('emptyDefault')}
              </p>
              <Button size="sm" className="mt-2" onClick={() => setIssueDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('issueCard')}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('columns.cardNumber')}</TableHead>
                    <TableHead>{t('columns.customer')}</TableHead>
                    <TableHead>
                      {isStamps ? t('columns.stampsBalance') : t('columns.pointsBalance')}
                    </TableHead>
                    <TableHead>{t('columns.tier')}</TableHead>
                    <TableHead>{t('columns.created')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow
                      key={card.uuid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(card.uuid)}
                    >
                      <TableCell className="font-mono text-sm">{card.cardNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{card.customer.name}</p>
                          {card.customer.email && (
                            <p className="text-xs text-muted-foreground">{card.customer.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {isStamps
                          ? (card.stampsBalance ?? 0).toLocaleString()
                          : card.pointsBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {card.currentTier ? (
                          <Badge
                            style={{
                              backgroundColor: card.currentTier.color,
                              color: '#fff',
                            }}
                          >
                            {card.currentTier.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('noTier')}</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(card.createdAt).toLocaleDateString(locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('page', {
                      page: pagination.page,
                      totalPages: pagination.total_pages,
                      total: pagination.total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      {t('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Issue Card Dialog */}
      <IssueCardDialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen} t={t} />
    </div>
  );
}
