import {
  LayoutDashboard,
  Building2,
  Users,
  ToggleLeft,
  Radio,
  Wrench,
  BarChart3,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

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
  {
    key: 'featureFlags',
    href: '/admin/feature-flags',
    icon: ToggleLeft,
  },
  {
    key: 'broadcast',
    href: '/admin/broadcast',
    icon: Radio,
  },
  {
    key: 'maintenance',
    href: '/admin/maintenance',
    icon: Wrench,
  },
  {
    key: 'metrics',
    href: '/admin/metrics',
    icon: BarChart3,
  },
  {
    key: 'auditLog',
    href: '/admin/audit-log',
    icon: ScrollText,
  },
];
