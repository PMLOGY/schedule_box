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
  useEmployeesQuery,
  useCreateEmployee,
  useUpdateEmployee,
  useAssignEmployeeServices,
  type Employee,
} from '@/hooks/use-employees-query';
import { useServicesQuery } from '@/hooks/use-services-query';

export default function EmployeesPage() {
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');

  // Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', title: '' });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    is_active: 'true',
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  const { data, isLoading } = useEmployeesQuery();
  const { data: allServices } = useServicesQuery();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const assignServicesMutation = useAssignEmployeeServices();

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        title: formData.title || undefined,
      });
      setDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', title: '' });
    } catch {
      // Error handled by mutation state
    }
  };

  const handleRowClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      title: employee.title || '',
      is_active: String(employee.is_active),
    });
    setSelectedServiceIds(employee.services.map((s) => s.id));
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingEmployee || !editFormData.name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        uuid: editingEmployee.uuid,
        name: editFormData.name,
        email: editFormData.email || undefined,
        phone: editFormData.phone || undefined,
        title: editFormData.title || undefined,
        is_active: editFormData.is_active === 'true',
      });

      // Check if services changed
      const originalIds = editingEmployee.services.map((s) => s.id).sort((a, b) => a - b);
      const newIds = [...selectedServiceIds].sort((a, b) => a - b);
      const servicesChanged =
        originalIds.length !== newIds.length || originalIds.some((id, i) => id !== newIds[i]);

      if (servicesChanged) {
        await assignServicesMutation.mutateAsync({
          uuid: editingEmployee.uuid,
          service_ids: selectedServiceIds,
        });
      }

      setEditDialogOpen(false);
      setEditingEmployee(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const isSaving = updateMutation.isPending || assignServicesMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={t('title')} />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('add')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.title')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.phone')}</TableHead>
              <TableHead>{t('columns.services')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('noEmployees')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((employee) => (
                <TableRow
                  key={employee.uuid}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(employee)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: employee.color }}
                      >
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.title || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.email || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t('servicesCount', { count: employee.services.length })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                      {employee.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
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
            <div className="grid gap-2">
              <Label htmlFor="title">{t('form.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('form.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
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

      {/* Edit Employee Dialog */}
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
            <div className="grid gap-2">
              <Label htmlFor="edit-title">{t('form.title')}</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t('form.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">{t('form.phone')}</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
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
            <div className="grid gap-2">
              <Label>{t('form.services')}</Label>
              {!allServices || allServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('form.noServicesAvailable')}</p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-md border min-h-[44px]">
                  {allServices.map((service) => (
                    <Badge
                      key={service.id}
                      variant={selectedServiceIds.includes(service.id) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleService(service.id)}
                    >
                      {service.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {(updateMutation.isError || assignServicesMutation.isError) && (
              <p className="text-sm text-destructive">{t('updateError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={!editFormData.name.trim() || isSaving}>
              {isSaving ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
