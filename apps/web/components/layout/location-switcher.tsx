'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function LocationSwitcher() {
  const t = useTranslations('organization');
  const { user, switchLocation } = useAuthStore();

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const result = await apiClient.get<OrganizationResponse | null>('/organizations');
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 min - org data rarely changes
    enabled: !!user && !isAdmin && !isCustomer, // Only for owner/employee/manager with company context
  });

  // Don't render anything if user has no organization
  if (isLoading || !org || !org.locations || org.locations.length <= 1) {
    return null;
  }

  const currentCompanyId = user?.companyId;
  const currentLocation = org.locations.find((l) => l.company_uuid === currentCompanyId);
  const displayName = currentLocation?.company_name || user?.companyName || '';

  const handleSwitch = async (companyUuid: string) => {
    if (companyUuid === currentCompanyId) return;

    try {
      await switchLocation(companyUuid);
      // Full page reload to refresh all data with new company context
      // TanStack Query cache is company-scoped, so full reload is cleaner
      window.location.reload();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('switchError'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[200px] gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{org.name}</div>
        <DropdownMenuSeparator />
        {org.locations.map((location) => {
          const isActive = location.company_uuid === currentCompanyId;
          const isDeactivated = !location.is_active;

          return (
            <DropdownMenuItem
              key={location.company_uuid}
              onClick={() => !isDeactivated && handleSwitch(location.company_uuid)}
              disabled={isDeactivated}
              className={cn(
                'flex items-center gap-2',
                isDeactivated && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Check className={cn('h-4 w-4 shrink-0', isActive ? 'opacity-100' : 'opacity-0')} />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm">{location.company_name}</span>
                {location.address_city && (
                  <span className="truncate text-xs text-muted-foreground">
                    {location.address_city}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
