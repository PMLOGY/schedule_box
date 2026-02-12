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
  params: { company_slug: string };
  searchParams: { theme?: string; locale?: string };
}

export default function EmbedLayout({ children, searchParams }: EmbedLayoutProps) {
  const theme = searchParams.theme || 'light';

  return (
    <html lang={searchParams.locale || 'cs'} className={theme === 'dark' ? 'dark' : ''}>
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
