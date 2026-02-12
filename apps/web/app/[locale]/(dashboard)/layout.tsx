import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SkipLink } from '@/components/accessibility/skip-link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SkipLink />
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
    </AuthGuard>
  );
}
