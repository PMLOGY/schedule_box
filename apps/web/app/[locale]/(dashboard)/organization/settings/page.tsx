'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, XCircle, Trash2 } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

// ============================================================================
// Types
// ============================================================================

interface OrgLocation {
  company_uuid: string;
  company_name: string;
  company_slug: string;
  address_city: string | null;
  is_active: boolean;
}

interface OrganizationResponse {
  uuid: string;
  name: string;
  slug: string;
  max_locations: number;
  is_active: boolean;
  locations: OrgLocation[];
  member_count: number;
}

interface LocationDetail {
  uuid: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  is_active: boolean;
  created_at: string;
}

interface OrgMember {
  user_uuid: string;
  user_name: string;
  user_email: string;
  role: string;
  company_uuid: string | null;
  company_name: string | null;
  created_at: string;
}

// ============================================================================
// Location Management Section
// ============================================================================

function LocationsSection({ orgUuid, maxLocations }: { orgUuid: string; maxLocations: number }) {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationDetail | null>(null);

  // Add location form state
  const [addForm, setAddForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
  });

  // Edit location form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['organization', orgUuid, 'locations'],
    queryFn: async () => {
      return apiClient.get<LocationDetail[]>(`/organizations/${orgUuid}/locations`);
    },
    staleTime: 5 * 60 * 1000,
  });

  const addLocationMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      return apiClient.post(`/organizations/${orgUuid}/locations`, data);
    },
    onSuccess: () => {
      toast.success(t('locationAdded'));
      setAddDialogOpen(false);
      resetAddForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      toast.error(error.message || 'Error adding location');
    },
  });

  const editLocationMutation = useMutation({
    mutationFn: async ({ uuid, data }: { uuid: string; data: typeof editForm }) => {
      return apiClient.put(`/organizations/${orgUuid}/locations/${uuid}`, data);
    },
    onSuccess: () => {
      toast.success(t('locationUpdated'));
      setEditDialogOpen(false);
      setSelectedLocation(null);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Error updating location');
    },
  });

  const deactivateLocationMutation = useMutation({
    mutationFn: async (uuid: string) => {
      return apiClient.delete(`/organizations/${orgUuid}/locations/${uuid}`);
    },
    onSuccess: () => {
      toast.success(t('deactivateSuccess'));
      setDeactivateDialogOpen(false);
      setSelectedLocation(null);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Error deactivating location');
    },
  });

  const resetAddForm = () => {
    setAddForm({
      name: '',
      slug: '',
      email: '',
      phone: '',
      address_street: '',
      address_city: '',
      address_zip: '',
    });
  };

  const openEditDialog = (location: LocationDetail) => {
    setSelectedLocation(location);
    setEditForm({
      name: location.name,
      email: location.email || '',
      phone: location.phone || '',
      address_street: location.address_street || '',
      address_city: location.address_city || '',
      address_zip: location.address_zip || '',
    });
    setEditDialogOpen(true);
  };

  const openDeactivateDialog = (location: LocationDetail) => {
    setSelectedLocation(location);
    setDeactivateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('locations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('locations')}</CardTitle>
          <CardDescription>
            {t('locationsUsed', { count: locations.length, max: maxLocations })}
          </CardDescription>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={locations.length >= maxLocations}>
              <Plus className="mr-2 h-4 w-4" />
              {t('addLocation')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('addLocation')}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addLocationMutation.mutate(addForm);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">{t('fields.name')}</Label>
                  <Input
                    id="add-name"
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-slug">{t('fields.slug')}</Label>
                  <Input
                    id="add-slug"
                    value={addForm.slug}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    required
                    minLength={2}
                    placeholder="my-location"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">{t('fields.email')}</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-phone">{t('fields.phone')}</Label>
                <Input
                  id="add-phone"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="add-street">{t('fields.addressStreet')}</Label>
                  <Input
                    id="add-street"
                    value={addForm.address_street}
                    onChange={(e) => setAddForm((p) => ({ ...p, address_street: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-zip">{t('fields.addressZip')}</Label>
                  <Input
                    id="add-zip"
                    value={addForm.address_zip}
                    onChange={(e) => setAddForm((p) => ({ ...p, address_zip: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-city">{t('fields.addressCity')}</Label>
                <Input
                  id="add-city"
                  value={addForm.address_city}
                  onChange={(e) => setAddForm((p) => ({ ...p, address_city: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    resetAddForm();
                  }}
                >
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={addLocationMutation.isPending}>
                  {addLocationMutation.isPending ? tCommon('loading') : tCommon('save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fields.name')}</TableHead>
              <TableHead>{t('fields.slug')}</TableHead>
              <TableHead>{t('fields.addressCity')}</TableHead>
              <TableHead>{t('fields.status')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.uuid}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell className="text-muted-foreground">{location.slug}</TableCell>
                <TableCell>{location.address_city || '-'}</TableCell>
                <TableCell>
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? t('status.active') : t('status.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(location)}
                      title={t('editLocation')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {location.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeactivateDialog(location)}
                        title={t('deactivateLocation')}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {tCommon('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Location Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editLocation')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedLocation) {
                editLocationMutation.mutate({
                  uuid: selectedLocation.uuid,
                  data: editForm,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('fields.name')}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('fields.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('fields.phone')}</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-street">{t('fields.addressStreet')}</Label>
                <Input
                  id="edit-street"
                  value={editForm.address_street}
                  onChange={(e) => setEditForm((p) => ({ ...p, address_street: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zip">{t('fields.addressZip')}</Label>
                <Input
                  id="edit-zip"
                  value={editForm.address_zip}
                  onChange={(e) => setEditForm((p) => ({ ...p, address_zip: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">{t('fields.addressCity')}</Label>
              <Input
                id="edit-city"
                value={editForm.address_city}
                onChange={(e) => setEditForm((p) => ({ ...p, address_city: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={editLocationMutation.isPending}>
                {editLocationMutation.isPending ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deactivateLocation')}</DialogTitle>
            <DialogDescription>{t('deactivateConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deactivateLocationMutation.isPending}
              onClick={() => {
                if (selectedLocation) {
                  deactivateLocationMutation.mutate(selectedLocation.uuid);
                }
              }}
            >
              {deactivateLocationMutation.isPending ? tCommon('loading') : t('deactivateLocation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// Member Management Section
// ============================================================================

function MembersSection({ orgUuid, locations }: { orgUuid: string; locations: OrgLocation[] }) {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);

  // Add member form state
  const [addForm, setAddForm] = useState({
    user_email: '',
    role: 'location_manager' as 'franchise_owner' | 'location_manager',
    company_uuid: '',
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['organization', orgUuid, 'members'],
    queryFn: async () => {
      return apiClient.get<OrgMember[]>(`/organizations/${orgUuid}/members`);
    },
    staleTime: 5 * 60 * 1000,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      const payload: Record<string, string> = {
        user_email: data.user_email,
        role: data.role,
      };
      if (data.role === 'location_manager' && data.company_uuid) {
        payload.company_uuid = data.company_uuid;
      }
      return apiClient.post(`/organizations/${orgUuid}/members`, payload);
    },
    onSuccess: () => {
      toast.success(t('memberAdded'));
      setAddDialogOpen(false);
      resetAddForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Error adding member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userUuid: string) => {
      // The DELETE endpoint expects a body with user_uuid
      // apiClient.delete doesn't support body, so use a workaround with POST-like fetch
      const accessToken = (await import('@/stores/auth.store')).useAuthStore.getState().accessToken;
      const response = await fetch(`/api/v1/organizations/${orgUuid}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ user_uuid: userUuid }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorInfo = errorData?.error || errorData;
        throw {
          message: errorInfo.message || 'Error removing member',
          statusCode: response.status,
        };
      }
      return;
    },
    onSuccess: () => {
      toast.success(t('memberRemoved'));
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Error removing member');
    },
  });

  const resetAddForm = () => {
    setAddForm({
      user_email: '',
      role: 'location_manager',
      company_uuid: '',
    });
  };

  const openRemoveDialog = (member: OrgMember) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('members')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('members')}</CardTitle>
          <CardDescription>{t('memberCount', { count: members.length })}</CardDescription>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('addMember')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('addMember')}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMemberMutation.mutate(addForm);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="member-email">{t('fields.userEmail')}</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={addForm.user_email}
                  onChange={(e) => setAddForm((p) => ({ ...p, user_email: e.target.value }))}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">{t('fields.role')}</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(value: 'franchise_owner' | 'location_manager') =>
                    setAddForm((p) => ({ ...p, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="franchise_owner">{t('roles.franchise_owner')}</SelectItem>
                    <SelectItem value="location_manager">{t('roles.location_manager')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addForm.role === 'location_manager' && (
                <div className="space-y-2">
                  <Label htmlFor="member-location">{t('fields.location')}</Label>
                  <Select
                    value={addForm.company_uuid}
                    onValueChange={(value) => setAddForm((p) => ({ ...p, company_uuid: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('fields.location')} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter((l) => l.is_active)
                        .map((location) => (
                          <SelectItem key={location.company_uuid} value={location.company_uuid}>
                            {location.company_name}
                            {location.address_city ? ` (${location.address_city})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    resetAddForm();
                  }}
                >
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? tCommon('loading') : tCommon('save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fields.name')}</TableHead>
              <TableHead>{t('fields.email')}</TableHead>
              <TableHead>{t('fields.role')}</TableHead>
              <TableHead>{t('fields.location')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.user_uuid}>
                <TableCell className="font-medium">{member.user_name}</TableCell>
                <TableCell className="text-muted-foreground">{member.user_email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'franchise_owner' ? 'default' : 'secondary'}>
                    {t(
                      `roles.${member.role}` as 'roles.franchise_owner' | 'roles.location_manager',
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{member.company_name || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openRemoveDialog(member)}
                    title={t('removeMember')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {tCommon('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removeMember')}</DialogTitle>
            <DialogDescription>{t('removeConfirm')}</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <p className="text-sm text-muted-foreground">
              {selectedMember.user_name} ({selectedMember.user_email})
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={removeMemberMutation.isPending}
              onClick={() => {
                if (selectedMember) {
                  removeMemberMutation.mutate(selectedMember.user_uuid);
                }
              }}
            >
              {removeMemberMutation.isPending ? tCommon('loading') : t('removeMember')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// Organization Settings Page
// ============================================================================

export default function OrganizationSettingsPage() {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const result = await apiClient.get<OrganizationResponse | null>('/organizations');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('settings')} />
        <div className="text-muted-foreground">{tCommon('loading')}</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('settings')} />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('noOrgDescription')}</p>
            <Button asChild className="mt-4">
              <Link href={'/organization' as Parameters<typeof Link>[0]['href']}>
                {t('createOrg')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${org.name} - ${t('settings')}`}
        description={t('description')}
        actions={
          <Button asChild variant="outline">
            <Link href={'/organization' as Parameters<typeof Link>[0]['href']}>
              {t('overview')}
            </Link>
          </Button>
        }
      />

      <LocationsSection orgUuid={org.uuid} maxLocations={org.max_locations} />

      <MembersSection
        orgUuid={org.uuid}
        locations={org.locations.map((l) => ({
          company_uuid: l.company_uuid,
          company_name: l.company_name,
          company_slug: l.company_slug,
          address_city: l.address_city,
          is_active: l.is_active,
        }))}
      />
    </div>
  );
}
