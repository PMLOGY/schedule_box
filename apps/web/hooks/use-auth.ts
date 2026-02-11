'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we're on a dashboard route (protected route)
    const isDashboardRoute =
      pathname.startsWith('/') &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/register') &&
      !pathname.startsWith('/forgot-password') &&
      !pathname.startsWith('/reset-password') &&
      !pathname.startsWith('/portal') &&
      !pathname.startsWith('/api');

    if (!isAuthenticated && isDashboardRoute) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, pathname, router]);

  return {
    user,
    isAuthenticated,
    logout,
    isLoading,
  };
}
