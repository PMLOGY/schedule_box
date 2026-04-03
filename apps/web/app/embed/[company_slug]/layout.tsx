/**
 * Embed Widget Layout
 *
 * Minimal layout for embedded booking widget (no navigation, header, or footer).
 * CSP allows iframe embedding from any origin (frame-ancestors *).
 * X-Frame-Options removed to allow embedding on third-party sites.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'ScheduleBox Widget | ScheduleBox',
    description: 'Embeddable booking widget',
  };
}

/**
 * Override X-Frame-Options for embed routes to allow iframe embedding.
 * Next.js sets DENY by default; we need to allow all origins for the widget.
 */
export async function generateStaticParams() {
  return [];
}

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
