'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/accessibility/skip-link';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { user } = useAuthStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated (useAuth redirects to /login)
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated but not admin - show forbidden message
  if (user?.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-600 mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access the admin panel.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
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
        <aside aria-label="Admin sidebar">
          <AdminSidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
