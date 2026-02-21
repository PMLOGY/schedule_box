'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Brain, Calendar, Bell, CreditCard, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  { icon: Brain, key: 'aiPrediction' },
  { icon: Calendar, key: 'onlineBooking' },
  { icon: Bell, key: 'notifications' },
  { icon: CreditCard, key: 'payments' },
  { icon: Users, key: 'crm' },
  { icon: BarChart3, key: 'analytics' },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function FeatureGrid() {
  const t = useTranslations('landing.features');

  return (
    <section id="features" className="py-16 md:py-24 bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
        <motion.div
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.key} variants={item}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <Icon className="h-12 w-12 text-primary" />
                    <h3 className="mt-4 text-lg font-semibold">{t(feature.key)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t(`${feature.key}Desc`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
