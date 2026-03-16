import { LayoutDashboard, Building2, Users, type LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: 'dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    key: 'companies',
    href: '/admin/companies',
    icon: Building2,
  },
  {
    key: 'users',
    href: '/admin/users',
    icon: Users,
  },
];
