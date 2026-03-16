import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PublicBookingLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'publicCompany' });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 dark:bg-slate-950/90 relative">
      <GradientMesh preset="marketing" />

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-white/40 dark:bg-slate-900/70 dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-2xl font-bold text-primary">
            ScheduleBox
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 relative z-0">
        <div className="max-w-4xl mx-auto px-4">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-lg border-t border-white/40 dark:bg-slate-900/70 dark:border-white/10 py-6 relative z-0">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            {t('poweredBy')}{' '}
            <Link href={`/${locale}`} className="text-primary hover:underline font-medium">
              ScheduleBox
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
