'use client';

import { motion } from 'motion/react';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AddToCalendarButton } from './AddToCalendarButton';

interface BookingConfirmationSuccessProps {
  bookingUuid: string;
  serviceName: string;
  dateTime: string;
  employeeName?: string;
  price?: string;
}

export function BookingConfirmationSuccess({
  bookingUuid,
  serviceName,
  dateTime,
  employeeName,
  price,
}: BookingConfirmationSuccessProps) {
  const t = useTranslations('booking.wizard.step4');

  return (
    <div className="space-y-6 text-center">
      {/* Animated success icon — fade-in + scale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1], // ease-out-quint for satisfying feel
        }}
        className="flex justify-center"
      >
        <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
          <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
        </div>
      </motion.div>

      {/* Animated text — fade-in + slide up */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <h2 className="text-2xl font-bold text-foreground">{t('bookingConfirmed')}</h2>
        <p className="mt-1 text-muted-foreground">{t('thankYou')}</p>
      </motion.div>

      {/* Animated booking summary card — fade-in + slide up (staggered) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{serviceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">{t('datetime')}: </span>
              <span className="font-medium">{dateTime}</span>
            </div>
            {employeeName && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('employee')}: </span>
                <span className="font-medium">{employeeName}</span>
              </div>
            )}
            {price && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('price')}: </span>
                <span className="font-medium">{price}</span>
              </div>
            )}
            <Separator />
            {/* Add to calendar download button */}
            <AddToCalendarButton bookingUuid={bookingUuid} className="w-full" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
