'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Clock, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
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
  DialogDescription,
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
  useInviteEmployee,
  type Employee,
} from '@/hooks/use-employees-query';
import { useServicesQuery } from '@/hooks/use-services-query';
import { EmployeesEmptyState } from '@/components/onboarding/empty-states/employees-empty';
import { Link } from '@/lib/i18n/navigation';

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

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteSelectedUuid, setInviteSelectedUuid] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  const { data, isLoading } = useEmployeesQuery();
  const { data: allServices } = useServicesQuery();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const assignServicesMutation = useAssignEmployeeServices();
  const inviteMutation = useInviteEmployee();

  // Employees without a login account (eligible for invite)
  const employeesWithoutAccount = data?.filter((e) => !e.has_account) ?? [];

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

  const handleInviteOpen = () => {
    setInviteSelectedUuid('');
    setInviteEmail('');
    setInvitePassword('');
    setInviteDialogOpen(true);
  };

  const handleInviteEmployeeSelect = (uuid: string) => {
    setInviteSelectedUuid(uuid);
    // Pre-fill email from employee record if available
    const emp = data?.find((e) => e.uuid === uuid);
    if (emp?.email) {
      setInviteEmail(emp.email);
    }
  };

  const handleInvite = async () => {
    if (!inviteSelectedUuid || !inviteEmail || invitePassword.length < 8) return;
    try {
      await inviteMutation.mutateAsync({
        employee_uuid: inviteSelectedUuid,
        email: inviteEmail,
        password: invitePassword,
      });
      toast.success(t('inviteSuccess'));
      setInviteDialogOpen(false);
      setInviteSelectedUuid('');
      setInviteEmail('');
      setInvitePassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('inviteError');
      toast.error(message);
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleInviteOpen}
            disabled={employeesWithoutAccount.length === 0}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {t('inviteEmployee')}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add')}
          </Button>
        </div>
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
              <TableHead>Login</TableHead>
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
                <TableCell colSpan={7} className="p-0">
                  <EmployeesEmptyState onAddEmployee={() => setDialogOpen(true)} />
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
                  <TableCell>
                    {employee.has_account ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('hasAccount')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldOff className="h-3.5 w-3.5" />
                        {t('noAccount')}
                      </span>
                    )}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingEmployee && (
              <Button
                variant="outline"
                size="sm"
                className="mr-auto"
                asChild
                onClick={() => setEditDialogOpen(false)}
              >
                <Link href={`/settings`}>
                  <Clock className="h-4 w-4 mr-2" />
                  {t('manageSchedule')}
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={!editFormData.name.trim() || isSaving}>
              {isSaving ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Employee Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inviteTitle')}</DialogTitle>
            <DialogDescription>{t('inviteDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('selectEmployee')} *</Label>
              <Select value={inviteSelectedUuid} onValueChange={handleInviteEmployeeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {employeesWithoutAccount.map((emp) => (
                    <SelectItem key={emp.uuid} value={emp.uuid}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">{t('form.email')} *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-password">{t('setPassword')} *</Label>
              <Input
                id="invite-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="min. 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={
                !inviteSelectedUuid ||
                !inviteEmail ||
                invitePassword.length < 8 ||
                inviteMutation.isPending
              }
            >
              {inviteMutation.isPending ? tCommon('loading') : t('inviteEmployee')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
