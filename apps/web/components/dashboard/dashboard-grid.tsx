'use client';

import { useMemo } from 'react';
import { Calendar, Banknote, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { StatCard } from './stat-card';
import { useAnalyticsQuery } from '@/hooks/use-analytics-query';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { useAuthStore } from '@/stores/auth.store';
import { GlassShimmer } from '@/components/shared/glass-shimmer';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05, // 50ms between each card
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const, // Custom ease-out curve
    },
  },
};

export function DashboardGrid() {
  const t = useTranslations('dashboard');
  const isEmployee = useAuthStore((s) => s.user?.role) === 'employee';

  // Owner/manager: use analytics overview endpoint
  const { data: ownerData, isLoading: ownerLoading } = useAnalyticsQuery(30);

  // Employee: compute stats from own bookings
  const { data: myBookings, isLoading: empLoading } = useMyBookings(
    { page: 1, limit: 100 },
    { enabled: isEmployee },
  );

  const empStats = useMemo(() => {
    if (!myBookings?.data) return null;
    const bookings = myBookings.data;
    const total = myBookings.meta?.total ?? bookings.length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const pending = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed',
    ).length;
    const revenue = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.price || '0'), 0);
    return { total, completed, pending, revenue };
  }, [myBookings]);

  const isLoading = isEmployee ? empLoading : ownerLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassShimmer key={i} className="h-[120px]" />
        ))}
      </div>
    );
  }

  if (isEmployee) {
    return (
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={cardVariants}>
          <StatCard
            title={t('employee.totalBookings')}
            value={empStats?.total ?? 0}
            icon={Calendar}
            formatter="number"
          />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard
            title={t('employee.completedBookings')}
            value={empStats?.completed ?? 0}
            icon={CheckCircle}
            formatter="number"
          />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard
            title={t('employee.myRevenue')}
            value={empStats?.revenue ?? 0}
            icon={Banknote}
            formatter="currency"
          />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard
            title={t('employee.upcomingBookings')}
            value={empStats?.pending ?? 0}
            icon={Users}
            formatter="number"
          />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('todayBookings')}
          value={ownerData?.totalBookings ?? 0}
          trend={
            ownerData?.comparison.bookingsChange
              ? Math.round(ownerData.comparison.bookingsChange)
              : 0
          }
          icon={Calendar}
          formatter="number"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('monthlyRevenue')}
          value={ownerData?.totalRevenue ?? 0}
          trend={
            ownerData?.comparison.revenueChange ? Math.round(ownerData.comparison.revenueChange) : 0
          }
          icon={Banknote}
          formatter="currency"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('newCustomers')}
          value={ownerData?.totalCustomers ?? 0}
          icon={Users}
          formatter="number"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('noShowRate')}
          value={
            ownerData?.comparison?.noShowChange != null
              ? `${Math.abs(Math.round(ownerData.comparison.noShowChange))}%`
              : 'N/A'
          }
          trend={
            ownerData?.comparison?.noShowChange != null
              ? -Math.round(ownerData.comparison.noShowChange)
              : undefined
          }
          icon={AlertTriangle}
          formatter="number"
        />
      </motion.div>
    </motion.div>
  );
}
