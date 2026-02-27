'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { OrgAnalyticsData } from '@/hooks/use-org-analytics';

function formatCZK(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface OrgAnalyticsDashboardProps {
  data: OrgAnalyticsData;
}

export function OrgAnalyticsDashboard({ data }: OrgAnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Organization Name */}
      <div>
        <h2 className="text-xl font-semibold">{data.organizationName}</h2>
        <p className="text-sm text-muted-foreground">
          {data.locations.length} location{data.locations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Organization-level KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCZK(data.totals.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.totalBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.completedBookings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No-Shows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totals.noShows}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-location breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Location Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.locations.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {data.locations.map((location) => (
                <Card key={location.companyId} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{location.companyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue</span>
                        <p className="font-semibold">{formatCZK(location.totalRevenue)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bookings</span>
                        <p className="font-semibold">{location.totalBookings}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed</span>
                        <p className="font-semibold">{location.completedBookings}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Occupancy</span>
                        <p className="font-semibold">{location.occupancyApprox}%</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Occupancy</span>
                        <span>{location.occupancyApprox}%</span>
                      </div>
                      <Progress value={location.occupancyApprox} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No locations found in this organization
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
