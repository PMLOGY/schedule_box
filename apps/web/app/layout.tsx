import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
});

export const metadata: Metadata = {
  title: {
    template: '%s | ScheduleBox',
    default: 'ScheduleBox',
  },
  description: 'AI-powered reservation and scheduling platform',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
