import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Scissors,
  UserCog,
  BarChart3,
  Megaphone,
  Settings,
  Bell,
  Zap,
  Award,
  Brain,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string; // Translation key
  href: string;
  icon: LucideIcon;
  roles: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['owner', 'manager', 'employee'],
  },
  {
    key: 'calendar',
    href: '/calendar',
    icon: Calendar,
    roles: ['owner', 'manager', 'employee'],
  },
  {
    key: 'bookings',
    href: '/bookings',
    icon: BookOpen,
    roles: ['owner', 'manager', 'employee'],
  },
  {
    key: 'customers',
    href: '/customers',
    icon: Users,
    roles: ['owner', 'manager', 'employee'],
  },
  {
    key: 'services',
    href: '/services',
    icon: Scissors,
    roles: ['owner', 'manager'],
  },
  {
    key: 'employees',
    href: '/employees',
    icon: UserCog,
    roles: ['owner', 'manager'],
  },
  {
    key: 'notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['owner', 'manager'],
  },
  {
    key: 'automation',
    href: '/automation',
    icon: Zap,
    roles: ['owner', 'manager'],
  },
  {
    key: 'loyalty',
    href: '/loyalty',
    icon: Award,
    roles: ['owner', 'manager'],
  },
  {
    key: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['owner'],
  },
  {
    key: 'ai',
    href: '/ai/pricing',
    icon: Brain,
    roles: ['owner'],
  },
  {
    key: 'marketing',
    href: '/marketing',
    icon: Megaphone,
    roles: ['owner', 'manager'],
  },
  {
    key: 'settings',
    href: '/settings',
    icon: Settings,
    roles: ['owner'],
  },
];

export function filterNavByRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
