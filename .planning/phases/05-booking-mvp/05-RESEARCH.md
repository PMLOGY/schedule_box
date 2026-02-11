# Phase 5: Booking MVP - Research

**Researched:** 2026-02-11
**Domain:** Booking Systems, Availability Engines, Calendar Scheduling
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 implements a complete booking system with real-time availability calculation, double-booking prevention, multi-step customer-facing form, and drag-drop admin calendar. The core technical challenge is preventing race conditions while maintaining performance for concurrent bookings across multiple resources (employees, rooms, equipment) with complex availability rules (working hours, overrides, buffer times).

The stack is already locked: Drizzle ORM with PostgreSQL exclusion constraints for double-booking prevention, FullCalendar v6.1.20 for calendar UI, TanStack Query for optimistic updates, React Hook Form + Zod for multi-step validation, and date-fns v4 for timezone-aware scheduling. RabbitMQ events will broadcast booking lifecycle changes to other services.

Critical patterns: availability engine must combine working hours, overrides, existing bookings, and buffer times in a single optimized query; transaction-level locking with SELECT FOR UPDATE prevents concurrent double-booking; multi-step form with per-step Zod validation improves conversion; optimistic updates with rollback provide snappy UX; booking expiration mechanism releases unpaid slots after 30 minutes.

**Primary recommendation:** Implement availability calculation as a single Drizzle query that returns pre-filtered slots, not a loop-per-slot approach. Use PostgreSQL exclusion constraint as last line of defense, not primary prevention. Structure booking flow as 4 isolated steps with separate Zod schemas that merge into final validation.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FullCalendar | 6.1.20 | Calendar UI with drag-drop, resource timeline | Industry standard for scheduling UIs, already installed, handles complex resource views |
| TanStack Query | 5.90.20 | Server state, cache management, optimistic updates | De facto React server state solution, automatic background refetching, built-in retry logic |
| React Hook Form | 7.71.1 | Multi-step form state management | Performance leader for forms, minimal re-renders, seamless Zod integration |
| Zod | 3.23.0 | Schema validation for booking inputs | TypeScript-first validation, type inference, runtime safety |
| date-fns | 4.1.0 | Timezone-aware date manipulation | Lightweight, tree-shakeable, first-class timezone support in v4, functional API |
| Drizzle ORM | 0.36.4 | Transaction management, SELECT FOR UPDATE | Already chosen ORM, supports PostgreSQL row-level locking |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|------------|
| @fullcalendar/interaction | 6.1.20 | Drag-drop, event resizing | Admin calendar rescheduling |
| @fullcalendar/resource-timeline | 6.1.20 | Multi-resource view (employees, rooms) | Multi-resource bookings (BOOK-09) |
| @date-fns/tz | 4.1.0 | Timezone conversion utilities | zonedTimeToUtc (booking submission), utcToZonedTime (display) |
| class-variance-authority | 0.7.1 | Step indicator UI variants | Multi-step form progress visualization |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FullCalendar | react-big-calendar | Free but lacks resource scheduling, weaker drag-drop, no commercial support |
| FullCalendar | Bryntum Scheduler | Better performance for 5000+ resources but expensive license, overkill for SMB |
| TanStack Query | SWR | Simpler API but weaker mutation support, no built-in optimistic updates pattern |
| date-fns | Luxon | Heavier bundle, redundant with date-fns v4 timezone support |

**Installation:**
```bash
# Already installed in apps/web/package.json
# No additional packages needed beyond existing dependencies
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/
├── app/[locale]/(dashboard)/
│   ├── bookings/
│   │   ├── page.tsx                    # Booking list + calendar view
│   │   └── [id]/
│   │       ├── page.tsx                # Booking detail
│   │       └── edit/page.tsx           # Admin booking edit
│   └── book/
│       └── page.tsx                    # Public 4-step booking form
├── components/booking/
│   ├── BookingCalendar.tsx             # FullCalendar wrapper
│   ├── BookingForm/
│   │   ├── BookingWizard.tsx           # Multi-step orchestrator
│   │   ├── Step1ServiceSelect.tsx     # Service selection
│   │   ├── Step2DateTimeSelect.tsx    # Slot picker
│   │   ├── Step3CustomerInfo.tsx      # Customer details
│   │   └── Step4Confirmation.tsx      # Review + submit
│   ├── AvailabilityGrid.tsx            # Slot grid for step 2
│   └── BookingStatusBadge.tsx          # Status indicator
├── lib/booking/
│   ├── availability-engine.ts          # Core availability calculation
│   ├── buffer-time.ts                  # Buffer time helpers
│   └── booking-expiration.ts           # Timeout logic
└── stores/
    └── booking-wizard.ts               # Zustand store for multi-step state
```

### Pattern 1: Availability Engine Query

**What:** Single SQL query that returns available slots by combining working hours, overrides, existing bookings, and buffer times.

**When to use:** Every time the customer picks a service or navigates to a new date/week.

**Example:**
```typescript
// lib/booking/availability-engine.ts
import { db } from '@schedulebox/database';
import { bookings, workingHours, workingHoursOverrides, services, employees } from '@schedulebox/database/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { addMinutes, format } from 'date-fns';
import { zonedTimeToUtc } from '@date-fns/tz';

interface AvailabilityParams {
  companyId: number;
  serviceId: number;
  employeeId?: number; // Optional: specific employee or "any available"
  dateFrom: Date;
  dateTo: Date;
  timezone: string;
}

export async function calculateAvailability(params: AvailabilityParams) {
  const { companyId, serviceId, employeeId, dateFrom, dateTo, timezone } = params;

  // 1. Get service details (duration + buffer times)
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.companyId, companyId),
      eq(services.isActive, true)
    ),
    columns: {
      durationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
    },
  });

  if (!service) throw new Error('Service not found');

  const totalDuration =
    service.bufferBeforeMinutes +
    service.durationMinutes +
    service.bufferAfterMinutes;

  // 2. Get working hours for date range
  // This query combines regular working hours with overrides
  const availabilitySlots = await db.execute(sql`
    WITH date_series AS (
      SELECT generate_series(
        ${dateFrom}::date,
        ${dateTo}::date,
        '1 day'::interval
      )::date AS date
    ),
    working_periods AS (
      SELECT
        ds.date,
        wh.employee_id,
        wh.start_time,
        wh.end_time
      FROM date_series ds
      CROSS JOIN working_hours wh
      WHERE wh.company_id = ${companyId}
        AND wh.is_active = true
        AND wh.day_of_week = EXTRACT(DOW FROM ds.date)
        AND (wh.employee_id = ${employeeId} OR ${employeeId} IS NULL)
        AND NOT EXISTS (
          -- Exclude dates with day-off overrides
          SELECT 1 FROM working_hours_overrides who
          WHERE who.company_id = ${companyId}
            AND who.date = ds.date
            AND who.employee_id = wh.employee_id
            AND who.is_day_off = true
        )

      UNION ALL

      -- Add override working hours
      SELECT
        who.date,
        who.employee_id,
        who.start_time,
        who.end_time
      FROM working_hours_overrides who
      WHERE who.company_id = ${companyId}
        AND who.date >= ${dateFrom}::date
        AND who.date <= ${dateTo}::date
        AND who.is_day_off = false
        AND who.start_time IS NOT NULL
        AND (who.employee_id = ${employeeId} OR ${employeeId} IS NULL)
    ),
    existing_bookings AS (
      SELECT
        b.employee_id,
        b.start_time,
        b.end_time,
        s.buffer_before_minutes,
        s.buffer_after_minutes
      FROM bookings b
      INNER JOIN services s ON b.service_id = s.id
      WHERE b.company_id = ${companyId}
        AND b.status NOT IN ('cancelled', 'expired')
        AND b.start_time < ${dateTo}
        AND b.end_time > ${dateFrom}
        AND (b.employee_id = ${employeeId} OR ${employeeId} IS NULL)
    )
    SELECT
      wp.date,
      wp.employee_id,
      wp.start_time,
      wp.end_time,
      -- Check for conflicts with existing bookings (including buffer times)
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'start', eb.start_time - (eb.buffer_before_minutes || ' minutes')::interval,
            'end', eb.end_time + (eb.buffer_after_minutes || ' minutes')::interval
          )
        ) FILTER (WHERE eb.start_time IS NOT NULL),
        '[]'::jsonb
      ) AS blocked_periods
    FROM working_periods wp
    LEFT JOIN existing_bookings eb ON wp.employee_id = eb.employee_id
    GROUP BY wp.date, wp.employee_id, wp.start_time, wp.end_time
    ORDER BY wp.date, wp.start_time
  `);

  // 3. Generate time slots from working periods, excluding blocked times
  // This is done in application code for flexibility
  return generateSlotsFromPeriods(availabilitySlots.rows, totalDuration, timezone);
}

function generateSlotsFromPeriods(periods: any[], slotDuration: number, timezone: string) {
  const slots = [];

  for (const period of periods) {
    const { date, employee_id, start_time, end_time, blocked_periods } = period;

    let currentTime = new Date(`${date}T${start_time}`);
    const endTime = new Date(`${date}T${end_time}`);

    while (addMinutes(currentTime, slotDuration) <= endTime) {
      const slotStart = currentTime;
      const slotEnd = addMinutes(currentTime, slotDuration);

      // Check if slot overlaps with any blocked period
      const isBlocked = blocked_periods.some((blocked: any) => {
        const blockedStart = new Date(blocked.start);
        const blockedEnd = new Date(blocked.end);
        return slotStart < blockedEnd && slotEnd > blockedStart;
      });

      if (!isBlocked) {
        slots.push({
          employeeId: employee_id,
          startTime: zonedTimeToUtc(slotStart, timezone),
          endTime: zonedTimeToUtc(slotEnd, timezone),
          displayTime: format(slotStart, 'HH:mm'),
        });
      }

      // Move to next slot (15-minute intervals)
      currentTime = addMinutes(currentTime, 15);
    }
  }

  return slots;
}
```

### Pattern 2: Booking Creation with Row-Level Locking

**What:** Transaction with SELECT FOR UPDATE to prevent race conditions during concurrent booking attempts.

**When to use:** Every booking creation (POST /api/bookings).

**Example:**
```typescript
// apps/web/src/app/api/bookings/route.ts
import { db } from '@schedulebox/database';
import { bookings, services, employees } from '@schedulebox/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  const body = await request.json();
  const { serviceId, employeeId, startTime, endTime, customerId } = body;

  try {
    const booking = await db.transaction(async (tx) => {
      // 1. Lock employee record to prevent concurrent bookings
      const employee = await tx
        .select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .for('update'); // PostgreSQL row-level lock

      if (!employee.length) {
        throw new Error('Employee not found');
      }

      // 2. Verify slot is still available
      const conflictingBooking = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.employeeId, employeeId),
            eq(bookings.companyId, employee[0].companyId),
            sql`${bookings.status} NOT IN ('cancelled', 'expired')`,
            // Check for overlap using tstzrange
            sql`tstzrange(${bookings.startTime}, ${bookings.endTime}) && tstzrange(${startTime}, ${endTime})`
          )
        )
        .limit(1);

      if (conflictingBooking.length > 0) {
        throw new Error('Slot no longer available');
      }

      // 3. Create booking
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          companyId: employee[0].companyId,
          customerId,
          serviceId,
          employeeId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: 'pending',
          source: 'online',
          // ... other fields
        })
        .returning();

      return newBooking;
    });

    // 4. Publish domain event (after transaction commits)
    await publishEvent('booking.created', booking);

    return Response.json(booking, { status: 201 });
  } catch (error) {
    if (error.message === 'Slot no longer available') {
      return Response.json({ error: 'SLOT_TAKEN' }, { status: 409 });
    }
    throw error;
  }
}
```

### Pattern 3: Multi-Step Booking Form with Zustand

**What:** Wizard component that manages 4-step state with Zustand, per-step validation with Zod, and final submission.

**When to use:** Customer-facing booking flow.

**Example:**
```typescript
// stores/booking-wizard.ts
import { create } from 'zustand';

interface BookingWizardState {
  step: 1 | 2 | 3 | 4;
  data: {
    serviceId?: number;
    employeeId?: number;
    startTime?: string;
    endTime?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
  };
  setStep: (step: 1 | 2 | 3 | 4) => void;
  updateData: (data: Partial<BookingWizardState['data']>) => void;
  reset: () => void;
}

export const useBookingWizard = create<BookingWizardState>((set) => ({
  step: 1,
  data: {},
  setStep: (step) => set({ step }),
  updateData: (data) => set((state) => ({ data: { ...state.data, ...data } })),
  reset: () => set({ step: 1, data: {} }),
}));

// components/booking/BookingForm/BookingWizard.tsx
import { useBookingWizard } from '@/stores/booking-wizard';
import Step1ServiceSelect from './Step1ServiceSelect';
import Step2DateTimeSelect from './Step2DateTimeSelect';
import Step3CustomerInfo from './Step3CustomerInfo';
import Step4Confirmation from './Step4Confirmation';

export default function BookingWizard() {
  const { step } = useBookingWizard();

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator currentStep={step} />

      {step === 1 && <Step1ServiceSelect />}
      {step === 2 && <Step2DateTimeSelect />}
      {step === 3 && <Step3CustomerInfo />}
      {step === 4 && <Step4Confirmation />}
    </div>
  );
}

// components/booking/BookingForm/Step3CustomerInfo.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBookingWizard } from '@/stores/booking-wizard';

const step3Schema = z.object({
  customerName: z.string().min(2, 'Name required'),
  customerEmail: z.string().email('Invalid email'),
  customerPhone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Invalid phone'),
  notes: z.string().optional(),
});

export default function Step3CustomerInfo() {
  const { data, updateData, setStep } = useBookingWizard();

  const form = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      customerName: data.customerName || '',
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
      notes: data.notes || '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateData(values);
    setStep(4); // Move to confirmation
  });

  return (
    <form onSubmit={onSubmit}>
      {/* Form fields */}
      <button type="submit">Continue to Confirmation</button>
    </form>
  );
}
```

### Pattern 4: Optimistic Updates with TanStack Query

**What:** Immediately update UI when dragging booking to new time, rollback on failure.

**When to use:** Admin calendar drag-and-drop rescheduling.

**Example:**
```typescript
// hooks/use-reschedule-booking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, startTime, endTime }: {
      bookingId: number;
      startTime: Date;
      endTime: Date;
    }) => {
      return apiClient.patch(`/bookings/${bookingId}`, { startTime, endTime });
    },

    onMutate: async ({ bookingId, startTime, endTime }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings'] });

      // Snapshot current state
      const previousBookings = queryClient.getQueryData(['bookings']);

      // Optimistically update UI
      queryClient.setQueryData(['bookings'], (old: any) => {
        return old.map((booking: any) =>
          booking.id === bookingId
            ? { ...booking, startTime, endTime }
            : booking
        );
      });

      // Return rollback context
      return { previousBookings };
    },

    onError: (err, variables, context) => {
      // Rollback on failure
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings'], context.previousBookings);
      }
      toast.error('Failed to reschedule. Slot may be taken.');
    },

    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// components/booking/BookingCalendar.tsx
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRescheduleBooking } from '@/hooks/use-reschedule-booking';

export default function BookingCalendar({ bookings }: { bookings: any[] }) {
  const reschedule = useRescheduleBooking();

  const handleEventDrop = (info: any) => {
    const { event } = info;

    reschedule.mutate({
      bookingId: event.id,
      startTime: event.start,
      endTime: event.end,
    }, {
      onError: () => {
        info.revert(); // Revert drag if mutation fails
      },
    });
  };

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      events={bookings.map(b => ({
        id: b.id,
        title: b.service.name,
        start: b.startTime,
        end: b.endTime,
        color: b.service.color,
      }))}
      editable={true}
      eventDrop={handleEventDrop}
      eventResize={handleEventDrop}
    />
  );
}
```

### Anti-Patterns to Avoid

- **Loop-per-slot availability check:** Querying database for each 15-minute slot is O(n) slow. Use single query with time range filtering.
- **Client-side timezone conversion before storage:** Always store UTC in database, convert only for display. Prevents daylight saving bugs.
- **Skipping SELECT FOR UPDATE:** Relying only on exclusion constraint means you learn about conflicts AFTER attempting insert. Lock rows proactively.
- **Monolithic multi-step form state:** Single Zod schema for all 4 steps prevents per-step validation. Split schemas, merge at final submission.
- **No booking expiration:** Unpaid pending bookings block slots forever. Implement 30-minute TTL with background job.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar UI | Custom grid with drag-drop | FullCalendar | Resource timeline, timezone handling, accessibility, 10+ years of edge case fixes |
| Timezone conversion | Manual offset calculation | date-fns v4 @date-fns/tz | Daylight saving transitions, IANA database updates, locale formatting |
| Form validation | Custom validation functions | Zod + zodResolver | Type inference, runtime safety, automatic error messages, composable schemas |
| Optimistic updates | Manual cache mutation | TanStack Query mutation hooks | Rollback on error, automatic refetching, concurrent mutation handling |
| Multi-step wizard | Custom step router | Zustand + React Hook Form | State persistence, back/forward navigation, conditional steps |
| Booking expiration | setTimeout in API route | Background job (BullMQ/Agenda) | Survives server restarts, distributed systems, automatic retries |

**Key insight:** Booking systems have deceptively complex edge cases (daylight saving transitions during booking window, concurrent bookings across timezones, partial cancellations with resource re-allocation). Mature libraries have handled these for years.

## Common Pitfalls

### Pitfall 1: Timezone Confusion in Availability Calculation

**What goes wrong:** Working hours stored as TIME (09:00) without timezone, bookings stored as TIMESTAMPTZ. When user in different timezone books, slot calculation breaks because you're comparing apples (local time) to oranges (UTC timestamp).

**Why it happens:** PostgreSQL TIME type is timezone-naive. Combining it with TIMESTAMPTZ requires explicit timezone context.

**How to avoid:**
- Always pass user's timezone to availability engine
- Convert TIME to TIMESTAMPTZ using company's timezone: `(date || ' ' || start_time)::timestamp AT TIME ZONE company_timezone`
- Use date-fns `zonedTimeToUtc()` when converting user input to UTC for storage
- Use `utcToZonedTime()` when displaying bookings to users

**Warning signs:**
- Bookings appear 1-2 hours off in calendar after daylight saving change
- Availability shows wrong slots for users in different timezones
- Unit tests pass but production shows wrong times

### Pitfall 2: Buffer Time Double-Counting

**What goes wrong:** Adding buffer time to both the existing booking AND the new slot check, causing 2x buffer gap. E.g., service has 15min buffer_after, existing booking ends at 10:00, next slot should start at 10:15, but code blocks until 10:30.

**Why it happens:** Buffer times stored on services table, applied during both booking creation and availability calculation. Easy to add buffer twice.

**How to avoid:**
- Store actual booked start/end times WITHOUT buffer in bookings table
- Apply buffer only during conflict detection: `tstzrange(start - buffer_before, end + buffer_after)`
- Document clearly: "bookings.start_time is appointment start, not including buffer"

**Warning signs:**
- Availability shows fewer slots than expected
- Manual testing shows larger gaps than configured buffer time
- Two 30min services with 15min buffer show 1h45min total block instead of 1h15min

### Pitfall 3: Race Condition Despite Exclusion Constraint

**What goes wrong:** Two concurrent requests both query for available slots, both see slot as free, both attempt to insert, one succeeds, other gets exclusion constraint violation AFTER passing all business logic.

**Why it happens:** READ COMMITTED isolation level allows non-repeatable reads. Slot availability checked outside transaction, booking inserted inside transaction.

**How to avoid:**
- Wrap availability re-check AND insert in single transaction with SELECT FOR UPDATE
- Lock employee row before final availability check: `tx.select().from(employees).where(eq(employees.id, employeeId)).for('update')`
- Treat exclusion constraint as last-resort safety net, not primary prevention
- Return 409 Conflict with `SLOT_TAKEN` error code, let frontend retry with fresh availability

**Warning signs:**
- Intermittent constraint violation errors in logs during load testing
- Users report "slot taken" errors despite seeing slot as available
- Error rate correlates with concurrent user count

### Pitfall 4: FullCalendar Performance with 1000+ Events

**What goes wrong:** Loading 1 month of bookings for 10 employees (50 bookings/employee = 500 events) makes calendar sluggish. Drag-drop lags, initial render takes 2-3 seconds.

**Why it happens:** FullCalendar v6 lacks virtual rendering. All events rendered to DOM even if outside viewport.

**How to avoid:**
- Limit events to visible date range: fetch only -7 days to +30 days from current view
- Use FullCalendar's `events` as function for dynamic loading: `events: (fetchInfo, successCallback) => { ... }`
- Enable `lazyFetching: true` to prevent unnecessary refetches
- For resource timeline with 50+ employees, wait for FullCalendar v7.1 (Q2 2025) with virtual rendering or consider Bryntum Scheduler

**Warning signs:**
- Calendar takes >1s to render
- Drag-drop feels sluggish (>100ms delay)
- Browser DevTools Performance tab shows long layout/paint times
- Memory usage grows >200MB

### Pitfall 5: Booking Expiration Orphans Slots

**What goes wrong:** Pending booking set to expire after 30min, cron job runs every hour, booking sits in "pending" for up to 90 minutes blocking the slot.

**Why it happens:** Fixed-interval cron jobs have poor temporal resolution for short timeouts.

**How to avoid:**
- Store `expiresAt: timestamp` in bookings table: `NOW() + INTERVAL '30 minutes'`
- Use database-driven job queue (BullMQ with Redis, Agenda with MongoDB) that polls expiration times
- OR use PostgreSQL pg_cron for 1-minute granularity: `SELECT cron.schedule('expire-bookings', '* * * * *', $$UPDATE bookings SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()$$)`
- Add index on `(status, expires_at)` for fast expiration queries

**Warning signs:**
- Availability shows "no slots" but bookings table has expired pending bookings
- Users complain "slot disappeared but never got confirmed"
- Spike in expiration events every hour (instead of smooth distribution)

### Pitfall 6: Multi-Resource Overbooking

**What goes wrong:** Service requires "room #1 + massage table", booking checks only employee availability, not resource availability. Room gets double-booked.

**Why it happens:** Exclusion constraint on bookings table only checks `employee_id` overlap, doesn't check `booking_resources` junction table.

**How to avoid:**
- During availability calculation, join `booking_resources` to check resource conflicts
- Add separate exclusion constraint on resources: `ALTER TABLE booking_resources ADD CONSTRAINT no_resource_overlap EXCLUDE USING GIST (resource_id WITH =, tstzrange(start_time, end_time) WITH &&)`
- But wait - booking_resources doesn't have start_time. Need to join through bookings. Use CHECK constraint + trigger instead.
- Better: In availability query, add `LEFT JOIN booking_resources` and exclude slots where required resources are already booked

**Warning signs:**
- Two massage bookings in same room at same time
- Resource quantity goes negative (2 bookings for 1 available unit)
- Multi-resource services show more availability than single-resource services

## Code Examples

Verified patterns from official sources and project schema:

### Working Hours Override Check

```typescript
// Source: packages/database/src/schema/employees.ts + documentation pattern
import { db } from '@schedulebox/database';
import { workingHours, workingHoursOverrides } from '@schedulebox/database/schema';
import { and, eq } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * Get effective working hours for a specific date, respecting overrides
 */
export async function getEffectiveWorkingHours(
  companyId: number,
  employeeId: number,
  date: Date
) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // 1. Check for override first (vacation, custom hours, day off)
  const override = await db.query.workingHoursOverrides.findFirst({
    where: and(
      eq(workingHoursOverrides.companyId, companyId),
      eq(workingHoursOverrides.employeeId, employeeId),
      eq(workingHoursOverrides.date, dateStr)
    ),
  });

  if (override) {
    if (override.isDayOff) {
      return null; // Employee not working this day
    }
    return {
      startTime: override.startTime,
      endTime: override.endTime,
      isOverride: true,
    };
  }

  // 2. Fall back to regular weekly working hours
  const regularHours = await db.query.workingHours.findFirst({
    where: and(
      eq(workingHours.companyId, companyId),
      eq(workingHours.employeeId, employeeId),
      eq(workingHours.dayOfWeek, dayOfWeek),
      eq(workingHours.isActive, true)
    ),
  });

  if (!regularHours) {
    return null; // No working hours configured for this day
  }

  return {
    startTime: regularHours.startTime,
    endTime: regularHours.endTime,
    isOverride: false,
  };
}
```

### Buffer Time Application

```typescript
// Source: packages/database/src/schema/services.ts
import { addMinutes } from 'date-fns';

/**
 * Calculate total time block including service duration and buffers
 */
export function calculateBookingTimeBlock(service: {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}, appointmentStart: Date) {
  // Actual appointment time (what customer sees)
  const appointmentEnd = addMinutes(appointmentStart, service.durationMinutes);

  // Total blocked time (includes prep/cleanup buffers)
  const blockStart = addMinutes(appointmentStart, -service.bufferBeforeMinutes);
  const blockEnd = addMinutes(appointmentEnd, service.bufferAfterMinutes);

  return {
    appointmentStart,
    appointmentEnd,
    blockStart, // Use this for conflict detection
    blockEnd,   // Use this for conflict detection
    totalMinutes: service.bufferBeforeMinutes + service.durationMinutes + service.bufferAfterMinutes,
  };
}
```

### RabbitMQ Booking Event Publishing

```typescript
// Source: ScheduleBox documentation CloudEvents format
import { publishEvent } from '@schedulebox/events';

/**
 * Publish booking lifecycle events to RabbitMQ
 */
export async function publishBookingCreated(booking: {
  uuid: string;
  companyId: number;
  customerId: number;
  serviceId: number;
  employeeId: number;
  startTime: Date;
  status: string;
}) {
  await publishEvent({
    type: 'com.schedulebox.booking.created',
    source: 'booking-service',
    subject: booking.uuid,
    datacontenttype: 'application/json',
    data: {
      bookingId: booking.uuid, // Use UUID for external events, not SERIAL id
      companyId: booking.companyId,
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      employeeId: booking.employeeId,
      startTime: booking.startTime.toISOString(),
      status: booking.status,
    },
  });
}

// Other booking events:
// - com.schedulebox.booking.confirmed
// - com.schedulebox.booking.cancelled
// - com.schedulebox.booking.completed
// - com.schedulebox.booking.no_show
// - com.schedulebox.booking.rescheduled
```

### Drizzle Transaction with SELECT FOR UPDATE

```typescript
// Source: Drizzle ORM GitHub discussions #1337, #2875
import { db } from '@schedulebox/database';
import { bookings, employees } from '@schedulebox/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function createBookingWithLocking(data: {
  companyId: number;
  employeeId: number;
  serviceId: number;
  customerId: number;
  startTime: Date;
  endTime: Date;
  price: number;
}) {
  return await db.transaction(async (tx) => {
    // 1. Lock employee row to prevent concurrent bookings
    const [employee] = await tx
      .select()
      .from(employees)
      .where(eq(employees.id, data.employeeId))
      .for('update'); // Row-level lock in PostgreSQL

    if (!employee) {
      throw new Error('Employee not found');
    }

    // 2. Check for overlapping bookings (this query sees uncommitted changes within transaction)
    const overlap = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.employeeId, data.employeeId),
          sql`${bookings.status} NOT IN ('cancelled', 'expired')`,
          sql`tstzrange(${bookings.startTime}, ${bookings.endTime}) && tstzrange(${data.startTime}, ${data.endTime})`
        )
      )
      .limit(1);

    if (overlap.length > 0) {
      throw new Error('Slot already booked');
    }

    // 3. Insert booking
    const [booking] = await tx
      .insert(bookings)
      .values({
        companyId: data.companyId,
        employeeId: data.employeeId,
        serviceId: data.serviceId,
        customerId: data.customerId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending',
        price: data.price.toString(),
        currency: 'CZK',
        source: 'online',
      })
      .returning();

    return booking;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| moment.js for timezones | date-fns v4 with @date-fns/tz | date-fns v4 (2024) | Smaller bundle, tree-shakeable, first-class TZ support |
| Redux for form state | Zustand + React Hook Form | 2023-2024 | Less boilerplate, better performance, simpler mental model |
| Apollo Client for caching | TanStack Query v5 | v5 stable (2024) | Framework-agnostic, better TypeScript, simpler optimistic updates |
| Manual exclusion constraint SQL | Drizzle .for('update') | Drizzle 0.29+ (2024) | Type-safe locking, automatic transaction management |
| FullCalendar v5 | FullCalendar v6 | v6 (2023) | Better TypeScript support, improved resource views |

**Deprecated/outdated:**
- moment.js: Huge bundle size (67KB minified), mutable API causes bugs. Use date-fns v4 instead.
- Formik: Abandoned, last release 2021. Use React Hook Form.
- FullCalendar v5 premium plugins: v6 has breaking changes in resource API. Follow migration guide.

## Open Questions

1. **Multi-day bookings (e.g., 3-day workshop)**
   - What we know: Current schema supports start_time/end_time spanning multiple days
   - What's unclear: Should availability engine split into daily slots or treat as single block? How to handle working hours (9-5 each day vs continuous block)?
   - Recommendation: Phase 5 MVP focuses on same-day bookings. Document multi-day as Phase 6+ enhancement. If needed now, treat as single availability block (all or nothing).

2. **Booking expiration implementation strategy**
   - What we know: 30-minute expiration needed, bookings table ready (can add expires_at column)
   - What's unclear: BullMQ (requires Redis setup) vs pg_cron (requires PostgreSQL extension) vs simple cron job?
   - Recommendation: Phase 5 uses simple approach: cron job every 5 minutes with `UPDATE bookings SET status='expired' WHERE status='pending' AND created_at < NOW() - INTERVAL '30 minutes'`. Migrate to BullMQ in Phase 7 (Notifications) when Redis is added.

3. **"Busy appearance" feature (hiding X% of available slots)**
   - What we know: companies.busy_appearance_enabled and busy_appearance_percent columns exist
   - What's unclear: Applied during availability calculation or during display? Random slots or algorithm-based?
   - Recommendation: Apply during frontend display (filter randomly), not in availability engine. Prevents database load, easier A/B testing.

4. **FullCalendar licensing for resource timeline**
   - What we know: Resource plugins require commercial license, package.json includes @fullcalendar/resource-timeline
   - What's unclear: License already purchased? Need to verify before deployment.
   - Recommendation: Confirm license status with stakeholder. If unlicensed, Phase 5 can use free timeGridWeek view, add resource timeline in Phase 6.

5. **Cancellation policy enforcement**
   - What we know: services.cancellation_policy_hours (default 24h) exists
   - What's unclear: Block cancellation UI if within policy window, or show warning and allow?
   - Recommendation: Block cancellation via API (return 403), show warning in UI. Admin role can override.

## Sources

### Primary (HIGH confidence)

- FullCalendar v6 Official Documentation - Event dragging/resizing, resource timeline features
- TanStack Query Official Docs - Optimistic updates pattern, mutation handling
- Drizzle ORM GitHub Discussions #1337, #2875 - SELECT FOR UPDATE implementation
- PostgreSQL 16 Documentation - Exclusion constraints, tstzrange operators
- date-fns v4 Blog Post - First-class timezone support announcement
- Project Schema Files - packages/database/src/schema/bookings.ts, employees.ts, services.ts

### Secondary (MEDIUM confidence)

- [How to Solve the Double Booking Problem with PostgreSQL](https://jsupskills.dev/how-to-solve-the-double-booking-problem/)
- [PostgreSQL Exclusion Constraints](https://medium.com/@jamshidbek-makhmudov/postgressql-exclusion-constraints-f9fdb4158f9e)
- [Preventing Race Conditions with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)
- [Building Reusable Multi-Step Form with React Hook Form and Zod](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/)
- [Optimistic Updates with TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [How to Handle Timezones with date-fns](https://jsdev.space/howto/timezones-date-fns/)

### Tertiary (LOW confidence - community insights, needs verification)

- [Booking Algorithms 2026 - GuestWisely](https://guestwisely.io/blog/booking-algorithms-2026/) - Industry trends, not technical implementation
- [Buffer Time Best Practices](https://www.bookingpressplugin.com/set-buffer-time-bookingpress/) - WordPress plugin docs, pattern transferable
- [5 Common Booking Mistakes](https://www.blab.co/blog/5-common-booking-mistakes-and-how-to-avoid-them) - General advice, not code-specific
- [FullCalendar Performance Issues GitHub #5673](https://github.com/fullcalendar/fullcalendar/issues/5673) - Community-reported, v7.1 virtual rendering planned Q2 2025

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed and version-locked in package.json
- Architecture: MEDIUM-HIGH - Patterns verified in Drizzle/TanStack/FullCalendar docs, but availability engine SQL needs real-world testing
- Pitfalls: MEDIUM - Based on PostgreSQL best practices + community reports, but specific to this schema requires validation
- Code examples: HIGH - Derived from official Drizzle ORM examples + existing project schema files
- Booking expiration: MEDIUM - Multiple implementation strategies possible, recommendation based on Phase 5 scope constraints
- RabbitMQ events: LOW - CloudEvents format confirmed in docs, but actual event publishing implementation not yet built

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days - booking patterns stable, library versions locked)

**What might be missing:**
- Real-world performance benchmarks for availability engine query with 10K bookings
- FullCalendar commercial license confirmation
- Multi-resource conflict detection edge cases
- Booking expiration race condition handling (two expiration jobs running simultaneously)
- Internationalization for error messages in booking form
