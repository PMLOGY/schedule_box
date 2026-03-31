/**
 * WaitlistBadge Component
 *
 * Displays capacity status for group class booking slots:
 * - Red "Plno" badge when slot is full, with optional waitlist count
 * - Green "Volno" badge when spots are available
 *
 * Integration notes:
 * - Use in BookingCalendar event tooltips or booking slot list views
 * - For portal/embed pages (e.g., apps/web/app/[locale]/(portal)/...),
 *   combine with a "Join Waitlist" button that calls POST /api/v1/bookings/waitlist
 */

'use client';

import { Badge } from '@/components/ui/badge';

export interface WaitlistBadgeProps {
  /** Number of people currently on the waitlist */
  waitlistCount: number;
  /** Maximum capacity of the group class */
  maxCapacity: number;
  /** Number of current confirmed/pending bookings */
  currentBookings: number;
}

export function WaitlistBadge({ waitlistCount, maxCapacity, currentBookings }: WaitlistBadgeProps) {
  const isFull = currentBookings >= maxCapacity;
  const spotsAvailable = maxCapacity - currentBookings;

  if (isFull) {
    return (
      <Badge variant="destructive" className="text-xs font-medium">
        Plno
        {waitlistCount > 0 && (
          <span className="ml-1 opacity-80">
            ({'\u010D'}ekac{'\u00ED'} listina: {waitlistCount})
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className="bg-green-600 text-white hover:bg-green-700 text-xs font-medium"
    >
      Volno ({spotsAvailable} {spotsAvailable === 1 ? 'm\u00EDsto' : 'm\u00EDst'})
    </Badge>
  );
}
