'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { PeriodSelector } from '@/components/analytics/period-selector';
import { AdminDashboard } from '@/components/analytics/admin-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';

export default function AdminAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminAnalytics(days);

  // Guard: admin-only access
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-2" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This page is restricted to platform administrators only.
            </p>
            <Button asChild>
              <Link href="/analytics">Back to Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admin Dashboard"
        description="SaaS health metrics and company analytics"
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
                  <Skeleton className="h-3 w-16 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : data ? (
        <AdminDashboard data={data} />
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No analytics data available
          </CardContent>
        </Card>
      )}
    </div>
  );
}
