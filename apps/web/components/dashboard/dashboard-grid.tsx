'use client';

import { Calendar, Banknote, Users, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { StatCard } from './stat-card';
import { useAnalyticsQuery } from '@/hooks/use-analytics-query';
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
  const { data, isLoading } = useAnalyticsQuery(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassShimmer key={i} className="h-[120px]" />
        ))}
      </div>
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
          value={data?.totalBookings ?? 0}
          trend={data?.comparison.bookingsChange ? Math.round(data.comparison.bookingsChange) : 0}
          icon={Calendar}
          formatter="number"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('monthlyRevenue')}
          value={data?.totalRevenue ?? 0}
          trend={data?.comparison.revenueChange ? Math.round(data.comparison.revenueChange) : 0}
          icon={Banknote}
          formatter="currency"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('newCustomers')}
          value={data?.totalCustomers ?? 0}
          icon={Users}
          formatter="number"
        />
      </motion.div>
      <motion.div variants={cardVariants}>
        <StatCard
          title={t('noShowRate')}
          value={
            data?.comparison?.noShowChange != null
              ? `${Math.abs(Math.round(data.comparison.noShowChange))}%`
              : 'N/A'
          }
          trend={
            data?.comparison?.noShowChange != null
              ? -Math.round(data.comparison.noShowChange)
              : undefined
          }
          icon={AlertTriangle}
          formatter="number"
        />
      </motion.div>
    </motion.div>
  );
}
