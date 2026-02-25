'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Building2, MapPin, Users, Plus } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

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

export default function OrganizationPage() {
  const t = useTranslations('organization');
  const tCommon = useTranslations('common');
  const { user, switchLocation } = useAuthStore();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState('');

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const result = await apiClient.get<OrganizationResponse | null>('/organizations');
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiClient.post<OrganizationResponse>('/organizations', { name });
    },
    onSuccess: () => {
      toast.success(t('createOrg'));
      setCreateDialogOpen(false);
      setOrgName('');
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error.statusCode === 402) {
        toast.error(t('upgradeRequired'));
      } else {
        toast.error(error.message || 'Error creating organization');
      }
    },
  });

  const handleSwitchLocation = async (companyUuid: string) => {
    if (companyUuid === user?.companyId) return;
    try {
      await switchLocation(companyUuid);
      window.location.reload();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('switchError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('title')} />
        <div className="text-muted-foreground">{tCommon('loading')}</div>
      </div>
    );
  }

  // No organization: show create CTA
  if (!org) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('title')} />
        <Card variant="glass" className="max-w-lg mx-auto text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>{t('noOrganization')}</CardTitle>
            <CardDescription>{t('noOrgDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('createOrg')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createOrg')}</DialogTitle>
                  <DialogDescription>{t('createOrgDescription')}</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (orgName.trim().length >= 2) {
                      createOrgMutation.mutate(orgName.trim());
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="org-name">{t('orgName')}</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={t('orgName')}
                      required
                      minLength={2}
                      maxLength={255}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      {tCommon('cancel')}
                    </Button>
                    <Button type="submit" disabled={createOrgMutation.isPending}>
                      {createOrgMutation.isPending ? tCommon('loading') : t('create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has organization: show overview
  return (
    <div className="space-y-8">
      <PageHeader
        title={org.name}
        description={t('description')}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/dashboard' as Parameters<typeof Link>[0]['href']}>
                {t('nav.dashboard')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/customers' as Parameters<typeof Link>[0]['href']}>
                {t('nav.customers')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={'/organization/settings' as Parameters<typeof Link>[0]['href']}>
                {t('nav.settings')}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="glass">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{org.locations.length}</p>
              <p className="text-sm text-muted-foreground">{t('locations')}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{org.member_count}</p>
              <p className="text-sm text-muted-foreground">{t('members')}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {t('locationsUsed', {
                  count: org.locations.length,
                  max: org.max_locations,
                })}
              </p>
              <p className="text-sm text-muted-foreground">{t('overview')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location cards grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">{t('locations')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {org.locations.map((location) => {
            const isCurrent = location.company_uuid === user?.companyId;
            return (
              <Card
                key={location.company_uuid}
                variant="glass"
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  isCurrent ? 'ring-2 ring-primary' : ''
                } ${!location.is_active ? 'opacity-60' : ''}`}
                onClick={() => location.is_active && handleSwitchLocation(location.company_uuid)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{location.company_name}</CardTitle>
                    <Badge variant={location.is_active ? 'default' : 'secondary'}>
                      {location.is_active ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </div>
                  {location.address_city && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location.address_city}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
