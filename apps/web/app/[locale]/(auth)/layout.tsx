import { Card, CardContent } from '@/components/ui/card';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ScheduleBox</h1>
          <p className="text-muted-foreground mt-2">AI-powered scheduling for SMBs</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
