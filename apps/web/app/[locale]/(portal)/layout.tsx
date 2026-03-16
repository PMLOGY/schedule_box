'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { PortalSidebar } from '@/components/layout/portal-sidebar';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/accessibility/skip-link';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'customer') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">This area is for registered customers only.</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SkipLink />
      <NavigationProgress />
      <GradientMesh preset="dashboard" />
      <div className="flex h-screen">
        <aside aria-label="Portal sidebar">
          <PortalSidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
