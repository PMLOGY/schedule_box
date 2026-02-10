import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScheduleBox',
  description: 'AI-powered reservation and scheduling platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
