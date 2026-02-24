'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { PeriodSelector } from '@/components/analytics/period-selector';
import { OrgAnalyticsDashboard } from '@/components/analytics/org-analytics-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import { useOrgAnalytics } from '@/hooks/use-org-analytics';

export default function OrganizationAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useOrgAnalytics(days);

  // If 403 error, user is not a franchise owner
  if (error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 403) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <CardTitle>Organization Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              This page is available to franchise owners with an active organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Analytics"
        description="Cross-location performance overview"
      />

      <PeriodSelector value={days} onChange={setDays} />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : data ? (
        <OrgAnalyticsDashboard data={data} />
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No organization data available
          </CardContent>
        </Card>
      )}
    </div>
  );
}
