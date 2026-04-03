'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Determines the correct redirect path based on user role
 */
function getHomeForRole(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'customer':
      return '/portal/bookings';
    default:
      return '/dashboard';
  }
}

/**
 * Check if the route is publicly accessible (no auth needed)
 */
function isPublicRoute(pathname: string): boolean {
  const publicPrefixes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Check if a user role is allowed to access a given path
 */
function isRoleAllowedForPath(role: string, pathname: string): boolean {
  // Admin routes — only admin
  if (pathname.startsWith('/admin')) {
    return role === 'admin';
  }
  // Portal routes — only customer
  if (pathname.startsWith('/portal')) {
    return role === 'customer';
  }
  // Dashboard routes — owner, employee, manager (not customer, not admin in normal dashboard)
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/reviews') ||
    pathname.startsWith('/automation') ||
    pathname.startsWith('/loyalty') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/ai') ||
    pathname.startsWith('/marketing') ||
    pathname.startsWith('/organization') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/schedule')
  ) {
    return ['owner', 'manager', 'employee', 'admin'].includes(role);
  }
  // Allow everything else (public booking pages, etc.)
  return true;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for Zustand persist middleware to hydrate from localStorage
    // before making any auth decisions — prevents false redirects to /login
    if (!_hasHydrated) {
      return;
    }

    if (isPublicRoute(pathname)) {
      setIsLoading(false);
      return;
    }

    // Not authenticated — redirect to login
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Authenticated but wrong role for this route — redirect to correct home
    if (!isRoleAllowedForPath(user.role, pathname)) {
      router.push(getHomeForRole(user.role));
      return;
    }

    setIsLoading(false);
  }, [_hasHydrated, isAuthenticated, user, pathname, router]);

  return {
    user,
    isAuthenticated,
    logout,
    isLoading,
  };
}
