/**
 * Booking Status Badge Component
 *
 * Displays booking status with color-coded badge.
 */

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@schedulebox/shared/types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

/**
 * Color mapping for booking statuses
 */
const STATUS_COLORS: Record<
  BookingStatus,
  { bg: string; text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-800' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' },
  no_show: { bg: 'bg-red-100', text: 'text-red-800' },
};

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const t = useTranslations('booking.status');

  const colors = STATUS_COLORS[status];

  return (
    <Badge className={`${colors.bg} ${colors.text} border-transparent`} variant="outline">
      {t(status)}
    </Badge>
  );
}
