import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
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
  Building2,
  MessageSquare,
  Wallet,
  Store,
  Video,
  Globe,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { SubscriptionPlan } from '@schedulebox/shared/types';

export interface NavItem {
  key: string; // Translation key
  href: string;
  icon: LucideIcon;
  roles: string[];
  minPlan?: SubscriptionPlan;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
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
    key: 'schedule',
    href: '/schedule',
    icon: CalendarDays,
    roles: ['employee'],
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
    key: 'payments',
    href: '/payments',
    icon: Wallet,
    roles: ['owner', 'manager'],
  },
  {
    key: 'notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['owner', 'manager'],
  },
  {
    key: 'reviews',
    href: '/reviews',
    icon: MessageSquare,
    roles: ['owner', 'manager'],
  },
  {
    key: 'automation',
    href: '/automation',
    icon: Zap,
    roles: ['owner', 'manager'],
    minPlan: 'growth',
  },
  {
    key: 'loyalty',
    href: '/loyalty',
    icon: Award,
    roles: ['owner', 'manager'],
    minPlan: 'growth',
  },
  {
    key: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['owner'],
    minPlan: 'essential',
  },
  {
    key: 'adminAnalytics',
    href: '/analytics/admin',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    key: 'ai',
    href: '/ai',
    icon: Brain,
    roles: ['owner'],
    minPlan: 'growth',
  },
  {
    key: 'marketing',
    href: '/marketing',
    icon: Megaphone,
    roles: ['owner', 'manager'],
    minPlan: 'essential',
  },
  {
    key: 'organization',
    href: '/organization',
    icon: Building2,
    roles: ['owner'],
  },
  // Resources hidden — not yet integrated into booking flow
  // {
  //   key: 'resources',
  //   href: '/resources',
  //   icon: Box,
  //   roles: ['owner', 'manager'],
  //   minPlan: 'essential',
  // },
  {
    key: 'marketplace',
    href: '/marketplace',
    icon: Store,
    roles: ['owner'],
    minPlan: 'growth',
  },
  {
    key: 'settings',
    href: '/settings',
    icon: Settings,
    roles: ['owner'],
  },
  {
    key: 'videoMeetings',
    href: '/settings/video-meetings',
    icon: Video,
    roles: ['owner'],
  },
  {
    key: 'webhooks',
    href: '/settings/webhooks',
    icon: Globe,
    roles: ['owner'],
  },
  {
    key: 'aiSettings',
    href: '/settings/ai',
    icon: Sparkles,
    roles: ['owner'],
  },
  {
    key: 'paymentSettings',
    href: '/settings/payments',
    icon: Wallet,
    roles: ['owner'],
  },
];

const PLAN_HIERARCHY: SubscriptionPlan[] = ['free', 'essential', 'growth', 'ai_powered'];

function planIndex(plan: SubscriptionPlan): number {
  return PLAN_HIERARCHY.indexOf(plan);
}

export function filterNav(role: string, plan: SubscriptionPlan = 'free'): NavItem[] {
  // Admin (superadmin) sees all nav items
  if (role === 'admin') return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.minPlan && planIndex(plan) < planIndex(item.minPlan)) return false;
    return true;
  });
}

/** @deprecated Use filterNav instead */
export function filterNavByRole(role: string): NavItem[] {
  return filterNav(role);
}
