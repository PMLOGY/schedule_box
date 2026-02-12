'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  // Split pathname and filter empty segments
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs = [{ label: t('dashboard'), href: '/' }];

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    // Try to translate the segment, fallback to capitalized segment
    const label = t(segment) || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  });

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />}
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
