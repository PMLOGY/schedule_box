'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Something went wrong</h3>
          {process.env.NODE_ENV === 'development' && error.message && (
            <p className="mt-2 text-sm text-muted-foreground break-all">{error.message}</p>
          )}
          <div className="mt-6 flex gap-3">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
