/**
 * Embed Widget Layout
 *
 * Minimal layout for embedded booking widget (no navigation, header, or footer).
 * This is a nested layout inside the root layout — it must NOT render <html>/<body>
 * since the root layout already handles those.
 */

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'ScheduleBox Widget',
    description: 'Embeddable booking widget',
  };
}

export async function generateStaticParams() {
  return [];
}

interface EmbedLayoutProps {
  children: React.ReactNode;
}

export default function EmbedLayout({ children }: EmbedLayoutProps) {
  return <div className="bg-background text-foreground min-h-screen">{children}</div>;
}
