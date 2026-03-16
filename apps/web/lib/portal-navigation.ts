import { BookOpen, User, type LucideIcon } from 'lucide-react';

export interface PortalNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { key: 'bookings', href: '/portal/bookings', icon: BookOpen },
  { key: 'profile', href: '/portal/profile', icon: User },
];
