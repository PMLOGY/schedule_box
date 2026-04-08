'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import {
  ArrowLeft,
  Pencil,
  Heart,
  TrendingUp,
  CalendarCheck,
  DollarSign,
  X,
  Plus,
} from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useCustomerDetail,
  useCustomerBookings,
  useUpdateCustomer,
  useTagsQuery,
  useUpdateCustomerTags,
  type CustomerTag,
} from '@/hooks/use-customers-query';
import { useCurrencyFormat } from '@/hooks/use-currency-format';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';
import { CustomerMemberships } from '@/components/customers/customer-memberships';
import { MedicalFields } from '@/components/customers/medical-fields';
import { VehicleRecords } from '@/components/customers/vehicle-records';

function getHealthBadgeVariant(
  score: number | null,
): 'glass-green' | 'glass-amber' | 'glass-red' | 'glass-gray' {
  if (score === null) return 'glass-gray';
  if (score > 70) return 'glass-green';
  if (score >= 40) return 'glass-amber';
  return 'glass-red';
}

function getHealthLabel(score: number | null, t: ReturnType<typeof useTranslations>): string {
  if (score === null) return '-';
  if (score > 70) return t('healthStatus.good');
  if (score >= 40) return t('healthStatus.average');
  return t('healthStatus.atRisk');
}

export default function CustomerDetailPage() {
  const params = useParams();
  const uuid = params.id as string;
  const router = useRouter();
  const t = useTranslations('customerDetail');
  const tCustomers = useTranslations('customers');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = { cs, sk, en: enUS }[locale] || cs;
  const { formatCurrency } = useCurrencyFormat();
  const { data: companySettings } = useCompanySettingsQuery();
  const industryType = companySettings?.industry_type ?? 'general';

  // Data fetching
  const {
    data: customerData,
    isLoading: customerLoading,
    isError: customerError,
    refetch: refetchCustomer,
  } = useCustomerDetail(uuid);
  const { data: bookingsData, isLoading: bookingsLoading } = useCustomerBookings(uuid);
  const { data: tagsData } = useTagsQuery();

  // Mutations
  const updateMutation = useUpdateCustomer();
  const tagsMutation = useUpdateCustomerTags();

  // Tab state
  const [activeTab, setActiveTab] = useState('bookings');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesInitialized, setNotesInitialized] = useState(false);

  // Tags state
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagsInitialized, setTagsInitialized] = useState(false);

  const customer = customerData;
  const bookings = bookingsData?.data || [];
  const allTags = tagsData?.data || [];

  // Initialize notes from customer data once loaded
  if (customer && !notesInitialized) {
    setNotes(customer.notes || '');
    setNotesInitialized(true);
  }

  // Initialize tags from customer data once loaded
  if (customer && !tagsInitialized) {
    setSelectedTagIds(customer.tags.map((tag) => tag.id));
    setTagsInitialized(true);
  }

  const openEditDialog = () => {
    if (!customer) return;
    setEditFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!customer || !editFormData.name.trim()) return;
    try {
      const origEmail = customer.email || '';
      const emailChanged = editFormData.email !== origEmail;
      await updateMutation.mutateAsync({
        uuid: customer.id,
        name: editFormData.name,
        ...(emailChanged && { email: editFormData.email || undefined }),
        phone: editFormData.phone || undefined,
        notes: editFormData.notes || undefined,
      });
      toast.success(tCustomers('updateSuccess'));
      setEditDialogOpen(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCustomers('updateError'));
    }
  };

  const handleSaveNotes = async () => {
    if (!customer) return;
    try {
      await updateMutation.mutateAsync({
        uuid: customer.id,
        notes: notes || undefined,
      });
      toast.success(tCustomers('updateSuccess'));
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCustomers('updateError'));
    }
  };

  const handleSaveTags = async () => {
    if (!customer) return;
    try {
      await tagsMutation.mutateAsync({
        uuid: customer.id,
        tagIds: selectedTagIds,
      });
      toast.success(tCustomers('updateSuccess'));
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCustomers('updateError'));
    }
  };

  const handleSaveMetadata = async (newMetadata: Record<string, unknown>) => {
    if (!customer) return;
    try {
      await updateMutation.mutateAsync({
        uuid: customer.id,
        customer_metadata: newMetadata,
      });
      toast.success(tCustomers('updateSuccess'));
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || tCustomers('updateError'));
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'PPP p', { locale: dateLocale });
  };

  // Loading state
  if (customerLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  // API error — show retry option instead of silent "no results"
  if (customerError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
        <Card variant="glass" className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">{tCommon('error')}</p>
          <Button variant="outline" onClick={() => refetchCustomer()}>
            {tCommon('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  // Customer not found
  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
        <Card variant="glass" className="p-8 text-center">
          <p className="text-muted-foreground">{tCommon('noResults')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/customers')}
            aria-label="Zpet na zakazniky"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
              <Badge variant={customer.is_active ? 'glass-green' : 'glass-gray'}>
                {customer.is_active ? tCustomers('active') : tCustomers('inactive')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {customer.email && <span>{customer.email}</span>}
              {customer.email && customer.phone && <span>|</span>}
              {customer.phone && <span>{customer.phone}</span>}
            </div>
          </div>
        </div>
        <Button onClick={openEditDialog}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('editCustomer')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('kpi.healthScore')}</p>
              <p className="text-2xl font-bold">{customer.health_score ?? '-'}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-2">
            <Badge variant={getHealthBadgeVariant(customer.health_score)}>
              {getHealthLabel(customer.health_score, t)}
            </Badge>
          </div>
        </Card>

        {/* CLV Predicted */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('kpi.clvPredicted')}</p>
              <p className="text-2xl font-bold">
                {customer.clv_predicted ? formatCurrency(customer.clv_predicted) : '-'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>

        {/* Total Bookings */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('kpi.totalBookings')}</p>
              <p className="text-2xl font-bold">{customer.total_bookings}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>

        {/* Total Spent */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('kpi.totalSpent')}</p>
              <p className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="bookings">{t('tabs.bookings')}</TabsTrigger>
          <TabsTrigger value="notes">{t('tabs.notes')}</TabsTrigger>
          <TabsTrigger value="tags">{t('tabs.tags')}</TabsTrigger>
          {industryType === 'medical_clinic' && (
            <TabsTrigger value="medical">Zdravotní záznam</TabsTrigger>
          )}
          {industryType === 'auto_service' && <TabsTrigger value="vehicles">Vozidla</TabsTrigger>}
        </TabsList>

        {/* Booking History Tab */}
        <TabsContent value="bookings">
          <Card variant="glass">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('bookingColumns.date')}</TableHead>
                    <TableHead>{t('bookingColumns.service')}</TableHead>
                    <TableHead>{t('bookingColumns.employee')}</TableHead>
                    <TableHead>{t('bookingColumns.status')}</TableHead>
                    <TableHead className="text-right">{t('bookingColumns.price')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {tCommon('loading')}
                      </TableCell>
                    </TableRow>
                  ) : bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('noBookings')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>{formatDateTime(booking.start_time)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {booking.service_id ? `#${booking.service_id}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {booking.employee_id ? `#${booking.employee_id}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === 'completed'
                                ? 'glass-green'
                                : booking.status === 'cancelled'
                                  ? 'glass-red'
                                  : booking.status === 'no_show'
                                    ? 'glass-amber'
                                    : 'glass-blue'
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {booking.price ? formatCurrency(booking.price) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card variant="glass" className="p-6">
            <div className="space-y-4">
              <Textarea
                placeholder={t('notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="resize-y"
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? tCommon('loading') : t('saveNotes')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags">
          <Card variant="glass" className="p-6">
            <div className="space-y-4">
              {/* Current tags */}
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noTags')}</p>
                ) : (
                  selectedTagIds.map((tagId) => {
                    const tag = allTags.find((t: CustomerTag) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge key={tag.id} variant="glass-blue" className="gap-1 pr-1">
                        {tag.color && (
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>

              {/* Available tags to add */}
              {allTags.filter((tag: CustomerTag) => !selectedTagIds.includes(tag.id)).length >
                0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('addTag')}</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags
                      .filter((tag: CustomerTag) => !selectedTagIds.includes(tag.id))
                      .map((tag: CustomerTag) => (
                        <Badge
                          key={tag.id}
                          variant="glass-gray"
                          className="cursor-pointer gap-1 hover:bg-muted/80 transition-colors"
                          onClick={() => toggleTag(tag.id)}
                        >
                          <Plus className="h-3 w-3" />
                          {tag.color && (
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          {tag.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveTags} disabled={tagsMutation.isPending}>
                  {tagsMutation.isPending ? tCommon('loading') : t('saveTags')}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Medical Fields Tab */}
        {industryType === 'medical_clinic' && (
          <TabsContent value="medical">
            <MedicalFields
              metadata={customer.customer_metadata ?? null}
              onSave={handleSaveMetadata}
              isLoading={updateMutation.isPending}
            />
          </TabsContent>
        )}

        {/* Vehicle Records Tab */}
        {industryType === 'auto_service' && (
          <TabsContent value="vehicles">
            <VehicleRecords
              metadata={customer.customer_metadata ?? null}
              onSave={handleSaveMetadata}
              isLoading={updateMutation.isPending}
              customerId={uuid}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Membership Section */}
      <CustomerMemberships customerId={uuid} />

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCustomers('editTitle')}</DialogTitle>
            <DialogDescription>{tCustomers('editDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{tCustomers('form.name')} *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{tCustomers('form.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">{tCustomers('form.phone')}</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">{tCustomers('form.notes')}</Label>
                <Textarea
                  id="edit-notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!editFormData.name.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
