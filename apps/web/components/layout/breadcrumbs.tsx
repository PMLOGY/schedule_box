'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

// UUID pattern — skip translation for dynamic route segments
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Also skip purely numeric segments (internal IDs)
const NUMERIC_RE = /^\d+$/;

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  // Split pathname and filter empty segments
  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs = [{ label: t('dashboard'), href: '/dashboard' }];

  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip UUIDs, numeric IDs, and 'dashboard' (already the root breadcrumb)
    if (UUID_RE.test(segment) || NUMERIC_RE.test(segment) || segment === 'dashboard') {
      return;
    }

    // Try to translate, use has() to avoid missing-key errors
    let label: string;
    try {
      label = t.has(segment) ? t(segment) : segment.charAt(0).toUpperCase() + segment.slice(1);
    } catch {
      label = segment.charAt(0).toUpperCase() + segment.slice(1);
    }
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
