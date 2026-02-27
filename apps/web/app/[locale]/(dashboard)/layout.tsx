import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/accessibility/skip-link';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { DashboardTour } from '@/components/onboarding/driver-tour';
import { GradientMesh } from '@/components/glass/gradient-mesh';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SkipLink />
      <NavigationProgress />
      <GradientMesh preset="dashboard" />
      <div className="flex h-screen">
        <aside aria-label="Dashboard sidebar">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      {/* Dashboard tour — driver.js contextual tooltips on first visit after onboarding.
          Renders nothing visually; only triggers the driver.js overlay. */}
      <DashboardTour />
    </AuthGuard>
  );
}
