/**
 * Booking Status Badge Component
 *
 * Displays booking status with color-coded glass badge.
 */

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@schedulebox/shared/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

/**
 * Glass variant mapping for booking statuses
 */
const STATUS_VARIANTS: Record<
  BookingStatus,
  'glass-blue' | 'glass-gray' | 'glass-red' | 'glass-amber' | 'glass-green'
> = {
  pending: 'glass-amber',
  confirmed: 'glass-blue',
  completed: 'glass-green',
  cancelled: 'glass-gray',
  no_show: 'glass-red',
};

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const t = useTranslations('booking.status');

  return <Badge variant={STATUS_VARIANTS[status]}>{t(status)}</Badge>;
}
