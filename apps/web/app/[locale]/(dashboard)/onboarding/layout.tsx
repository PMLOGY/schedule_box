import { AuthGuard } from '@/components/layout/auth-guard';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Minimal header — logo only, no sidebar */}
        <header className="border-b px-6 py-4">
          <div className="mx-auto max-w-800 flex items-center">
            <span className="text-xl font-bold text-foreground">ScheduleBox</span>
          </div>
        </header>

        {/* Centered content */}
        <main className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-[800px]">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
