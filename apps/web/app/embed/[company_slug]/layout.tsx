/**
 * Embed Widget Layout
 *
 * Minimal layout for embedded booking widget (no navigation, header, or footer).
 * CSP allows iframe embedding from any origin (frame-ancestors *).
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScheduleBox Widget',
  description: 'Embeddable booking widget',
};

interface EmbedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ company_slug: string }>;
  searchParams: Promise<{ theme?: string; locale?: string }>;
}

export default async function EmbedLayout({ children, searchParams }: EmbedLayoutProps) {
  const resolvedSearchParams = await searchParams;
  const theme = resolvedSearchParams.theme || 'light';

  return (
    <html lang={resolvedSearchParams.locale || 'cs'} className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors *;"
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>{children}</body>
    </html>
  );
}
