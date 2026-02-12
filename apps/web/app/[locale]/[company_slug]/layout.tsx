import Link from 'next/link';

export default function PublicBookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            ScheduleBox
          </Link>
          {/* Language switcher could go here if needed */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <Link href="https://schedulebox.cz" className="text-primary hover:underline">
              ScheduleBox
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
