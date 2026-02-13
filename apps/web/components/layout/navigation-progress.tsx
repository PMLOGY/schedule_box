'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from '@/lib/i18n/navigation';

/**
 * Global navigation progress bar.
 * Shows an animated top bar immediately when a same-origin link is clicked,
 * then completes when the pathname changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation completed — pathname changed
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      // Brief delay so the bar visually reaches 100% before disappearing
      timeoutRef.current = setTimeout(() => setIsNavigating(false), 150);
      prevPathname.current = pathname;
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  // Intercept clicks on internal links to start progress immediately
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor?.href) return;

    // Skip modified clicks (new tab, etc.)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    // Skip external links or target=_blank
    if (anchor.target === '_blank') return;

    try {
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      // Strip locale prefix for comparison (e.g. /cs/settings -> /settings)
      const stripLocale = (p: string) => p.replace(/^\/(cs|sk|en)(\/|$)/, '/');
      const targetPath = stripLocale(url.pathname);
      const currentPath = stripLocale(window.location.pathname);

      if (targetPath !== currentPath) {
        setIsNavigating(true);
      }
    } catch {
      // Invalid URL, ignore
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [handleClick]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/20">
      <div
        className="h-full bg-primary transition-transform duration-[2s] ease-out"
        style={{
          animation: 'nav-progress 2s ease-out forwards',
        }}
      />
      <style>{`
        @keyframes nav-progress {
          0% { width: 0%; }
          20% { width: 30%; }
          50% { width: 60%; }
          80% { width: 85%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
