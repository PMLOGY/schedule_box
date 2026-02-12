'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useServicesQuery,
  useServiceCategoriesQuery,
  useCreateService,
  useUpdateService,
  useCreateServiceCategory,
  type Service,
} from '@/hooks/use-services-query';

interface ServiceFormData {
  name: string;
  duration_minutes: string;
  price: string;
  category_id: string;
  max_capacity: string;
  online_booking_enabled: string;
}

const defaultFormData: ServiceFormData = {
  name: '',
  duration_minutes: '30',
  price: '0',
  category_id: 'none',
  max_capacity: '1',
  online_booking_enabled: 'true',
};

export default function ServicesPage() {
  const t = useTranslations('services');
  const tCommon = useTranslations('common');

  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);

  // Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({ ...defaultFormData });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState<ServiceFormData & { is_active: string }>({
    ...defaultFormData,
    is_active: 'true',
  });

  // New category dialog
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryTarget, setNewCategoryTarget] = useState<'create' | 'edit'>('create');

  const { data, isLoading } = useServicesQuery({ is_active: activeFilter });
  const { data: categories } = useServiceCategoriesQuery();
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const createCategoryMutation = useCreateServiceCategory();

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('cs', {
      style: 'currency',
      currency: 'CZK',
    }).format(parseFloat(price || '0'));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        price: parseFloat(formData.price) || 0,
        ...(formData.category_id !== 'none' && { category_id: parseInt(formData.category_id) }),
        max_capacity: parseInt(formData.max_capacity) || 1,
        online_booking_enabled: formData.online_booking_enabled === 'true',
      });
      setDialogOpen(false);
      setFormData({ ...defaultFormData });
    } catch {
      // Error handled by mutation state
    }
  };

  const handleRowClick = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      name: service.name,
      duration_minutes: String(service.duration_minutes),
      price: service.price,
      category_id: service.category_id ? String(service.category_id) : 'none',
      max_capacity: String(service.max_capacity),
      online_booking_enabled: String(service.online_booking_enabled),
      is_active: String(service.is_active),
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingService || !editFormData.name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        uuid: editingService.uuid,
        name: editFormData.name,
        duration_minutes: parseInt(editFormData.duration_minutes) || 30,
        price: parseFloat(editFormData.price) || 0,
        category_id:
          editFormData.category_id !== 'none' ? parseInt(editFormData.category_id) : undefined,
        max_capacity: parseInt(editFormData.max_capacity) || 1,
        online_booking_enabled: editFormData.online_booking_enabled === 'true',
        is_active: editFormData.is_active === 'true',
      });
      setEditDialogOpen(false);
      setEditingService(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const result = await createCategoryMutation.mutateAsync({ name: newCategoryName });
      const newId = String((result as { id: number }).id);
      if (newCategoryTarget === 'create') {
        setFormData((prev) => ({ ...prev, category_id: newId }));
      } else {
        setEditFormData((prev) => ({ ...prev, category_id: newId }));
      }
      setNewCategoryOpen(false);
      setNewCategoryName('');
    } catch {
      // Error handled by mutation state
    }
  };

  const openNewCategoryDialog = (target: 'create' | 'edit') => {
    setNewCategoryTarget(target);
    setNewCategoryName('');
    setNewCategoryOpen(true);
  };

  const renderCategorySelect = (
    value: string,
    onChange: (value: string) => void,
    target: 'create' | 'edit',
  ) => (
    <div className="grid gap-2">
      <Label>{t('form.category')}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('form.noCategory')}</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => openNewCategoryDialog(target)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={t('title')} />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={activeFilter ?? 'all'}
          onValueChange={(value) => setActiveFilter(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
            <SelectItem value="true">{t('filters.active')}</SelectItem>
            <SelectItem value="false">{t('filters.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.category')}</TableHead>
              <TableHead>{t('columns.duration')}</TableHead>
              <TableHead className="text-right">{t('columns.price')}</TableHead>
              <TableHead className="text-right">{t('columns.capacity')}</TableHead>
              <TableHead>{t('columns.onlineBooking')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('noServices')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((service) => (
                <TableRow
                  key={service.uuid}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(service)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {service.category_name || t('uncategorized')}
                  </TableCell>
                  <TableCell>
                    {service.duration_minutes} {t('minutes')}
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(service.price)}</TableCell>
                  <TableCell className="text-right">{service.max_capacity}</TableCell>
                  <TableCell>
                    <Badge variant={service.online_booking_enabled ? 'default' : 'outline'}>
                      {service.online_booking_enabled ? t('yes') : t('no')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('form.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            {renderCategorySelect(
              formData.category_id,
              (value) => setFormData((prev) => ({ ...prev, category_id: value })),
              'create',
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">{t('form.duration')}</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">{t('form.price')}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="10"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capacity">{t('form.capacity')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_capacity: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('form.onlineBooking')}</Label>
                <Select
                  value={formData.online_booking_enabled}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, online_booking_enabled: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive">{t('createError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('form.name')} *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            {renderCategorySelect(
              editFormData.category_id,
              (value) => setEditFormData((prev) => ({ ...prev, category_id: value })),
              'edit',
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-duration">{t('form.duration')}</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="5"
                  value={editFormData.duration_minutes}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, duration_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">{t('form.price')}</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="10"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-capacity">{t('form.capacity')}</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min="1"
                  value={editFormData.max_capacity}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, max_capacity: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('form.onlineBooking')}</Label>
                <Select
                  value={editFormData.online_booking_enabled}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({ ...prev, online_booking_enabled: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('form.status')}</Label>
              <Select
                value={editFormData.is_active}
                onValueChange={(value) =>
                  setEditFormData((prev) => ({ ...prev, is_active: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('active')}</SelectItem>
                  <SelectItem value="false">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-destructive">{t('updateError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editFormData.name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('form.newCategory')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">{t('form.categoryName')} *</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            {createCategoryMutation.isError && (
              <p className="text-sm text-destructive">{t('createError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
