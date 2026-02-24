/**
 * Demo Data Seeder
 *
 * Seeds a realistic Czech beauty salon (Beauty Studio Praha) with:
 * - 3 services (haircut, coloring, manicure)
 * - 5 Czech customers
 * - 10 bookings spread across past 2 weeks and upcoming 1 week
 *
 * All demo records are tagged in company.settings JSONB for clean removal.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { companies, services, customers, bookings } from '@schedulebox/database';

export interface SeedResult {
  servicesCreated: number;
  customersCreated: number;
  bookingsCreated: number;
}

interface DemoDataIds {
  service_ids: number[];
  customer_ids: number[];
  booking_ids: number[];
}

/**
 * Check if demo data has already been seeded for the given company
 */
export async function hasDemoData(companyId: number): Promise<boolean> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) return false;

  const settings = company.settings as Record<string, unknown> | null;
  return settings?.demo_data === true;
}

/**
 * Seed demo data — Beauty Studio Praha
 *
 * Creates 3 services, 5 Czech customers, and 10 bookings (mixed statuses).
 * Tags all created records in company.settings for later removal.
 */
export async function seedDemoData(companyId: number): Promise<SeedResult> {
  return db.transaction(async (tx) => {
    // -- 1. Create services --
    const createdServices = await tx
      .insert(services)
      .values([
        {
          companyId,
          name: 'Střih dámský',
          description:
            'Profesionální dámský střih s mytím a foukanou. Zahrnuje konzultaci a finální styling.',
          durationMinutes: 60,
          bufferAfterMinutes: 10,
          price: '500.00',
          currency: 'CZK',
          color: '#EC4899',
          onlineBookingEnabled: true,
          isActive: true,
        },
        {
          companyId,
          name: 'Barvení',
          description:
            'Barvení vlasů včetně mytí, aplikace barvy a finální úpravy. Cena se může lišit dle délky vlasů.',
          durationMinutes: 120,
          bufferAfterMinutes: 15,
          price: '1200.00',
          currency: 'CZK',
          color: '#8B5CF6',
          onlineBookingEnabled: true,
          isActive: true,
        },
        {
          companyId,
          name: 'Manikúra',
          description: 'Péče o nehty včetně tvarování, lakování a masáže rukou.',
          durationMinutes: 60,
          bufferAfterMinutes: 10,
          price: '400.00',
          currency: 'CZK',
          color: '#F59E0B',
          onlineBookingEnabled: true,
          isActive: true,
        },
      ])
      .returning({ id: services.id });

    const serviceIds = createdServices.map((s) => s.id);

    // -- 2. Create customers --
    const createdCustomers = await tx
      .insert(customers)
      .values([
        {
          companyId,
          name: 'Jana Novotná',
          email: 'jana.novotna@email.cz',
          phone: '+420 601 234 567',
          source: 'manual' as const,
        },
        {
          companyId,
          name: 'Petra Svobodová',
          email: 'petra.sv@email.cz',
          phone: '+420 602 345 678',
          source: 'manual' as const,
        },
        {
          companyId,
          name: 'Marie Dvořáková',
          email: 'marie.dvorakova@email.cz',
          phone: '+420 603 456 789',
          source: 'manual' as const,
        },
        {
          companyId,
          name: 'Eva Černá',
          email: 'eva.cerna@email.cz',
          phone: '+420 604 567 890',
          source: 'manual' as const,
        },
        {
          companyId,
          name: 'Lucie Procházková',
          email: 'lucie.p@email.cz',
          phone: '+420 605 678 901',
          source: 'manual' as const,
        },
      ])
      .returning({ id: customers.id });

    const customerIds = createdCustomers.map((c) => c.id);

    // -- 3. Create bookings --
    const now = new Date();

    // Helper: create Date offset by days from now
    const daysFromNow = (days: number, hour = 10): Date => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    // Calculate end time from start + duration
    const endTime = (start: Date, durationMinutes: number): Date => {
      return new Date(start.getTime() + durationMinutes * 60 * 1000);
    };

    // Service durations for end time calculation
    const durations = [60, 120, 60]; // haircut, coloring, manicure

    type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

    const bookingValues: Array<{
      companyId: number;
      serviceId: number;
      customerId: number;
      startTime: Date;
      endTime: Date;
      status: BookingStatus;
      source: 'admin';
      price: string;
      currency: string;
    }> = [
      // 5 completed bookings in the past (last 2 weeks)
      {
        companyId,
        serviceId: serviceIds[0], // haircut
        customerId: customerIds[0], // Jana
        startTime: daysFromNow(-14, 9),
        endTime: endTime(daysFromNow(-14, 9), durations[0]),
        status: 'completed',
        source: 'admin',
        price: '500.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[1], // coloring
        customerId: customerIds[1], // Petra
        startTime: daysFromNow(-11, 10),
        endTime: endTime(daysFromNow(-11, 10), durations[1]),
        status: 'completed',
        source: 'admin',
        price: '1200.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[2], // manicure
        customerId: customerIds[2], // Marie
        startTime: daysFromNow(-9, 14),
        endTime: endTime(daysFromNow(-9, 14), durations[2]),
        status: 'completed',
        source: 'admin',
        price: '400.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[0], // haircut
        customerId: customerIds[3], // Eva
        startTime: daysFromNow(-6, 11),
        endTime: endTime(daysFromNow(-6, 11), durations[0]),
        status: 'completed',
        source: 'admin',
        price: '500.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[2], // manicure
        customerId: customerIds[4], // Lucie
        startTime: daysFromNow(-3, 15),
        endTime: endTime(daysFromNow(-3, 15), durations[2]),
        status: 'completed',
        source: 'admin',
        price: '400.00',
        currency: 'CZK',
      },
      // 3 confirmed upcoming bookings (next 7 days)
      {
        companyId,
        serviceId: serviceIds[1], // coloring
        customerId: customerIds[0], // Jana
        startTime: daysFromNow(2, 10),
        endTime: endTime(daysFromNow(2, 10), durations[1]),
        status: 'confirmed',
        source: 'admin',
        price: '1200.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[0], // haircut
        customerId: customerIds[2], // Marie
        startTime: daysFromNow(4, 13),
        endTime: endTime(daysFromNow(4, 13), durations[0]),
        status: 'confirmed',
        source: 'admin',
        price: '500.00',
        currency: 'CZK',
      },
      {
        companyId,
        serviceId: serviceIds[2], // manicure
        customerId: customerIds[1], // Petra
        startTime: daysFromNow(6, 16),
        endTime: endTime(daysFromNow(6, 16), durations[2]),
        status: 'confirmed',
        source: 'admin',
        price: '400.00',
        currency: 'CZK',
      },
      // 1 cancelled booking (past)
      {
        companyId,
        serviceId: serviceIds[1], // coloring
        customerId: customerIds[3], // Eva
        startTime: daysFromNow(-8, 12),
        endTime: endTime(daysFromNow(-8, 12), durations[1]),
        status: 'cancelled',
        source: 'admin',
        price: '1200.00',
        currency: 'CZK',
      },
      // 1 no-show booking (past)
      {
        companyId,
        serviceId: serviceIds[0], // haircut
        customerId: customerIds[4], // Lucie
        startTime: daysFromNow(-5, 9),
        endTime: endTime(daysFromNow(-5, 9), durations[0]),
        status: 'no_show',
        source: 'admin',
        price: '500.00',
        currency: 'CZK',
      },
    ];

    const createdBookings = await tx
      .insert(bookings)
      .values(bookingValues)
      .returning({ id: bookings.id });

    const bookingIds = createdBookings.map((b) => b.id);

    // -- 4. Tag demo records in company settings --
    const [currentCompany] = await tx
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const currentSettings = (currentCompany?.settings as Record<string, unknown>) ?? {};

    const demoDataIds: DemoDataIds = {
      service_ids: serviceIds,
      customer_ids: customerIds,
      booking_ids: bookingIds,
    };

    await tx
      .update(companies)
      .set({
        settings: {
          ...currentSettings,
          demo_data: true,
          demo_data_ids: demoDataIds,
        },
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return {
      servicesCreated: serviceIds.length,
      customersCreated: customerIds.length,
      bookingsCreated: bookingIds.length,
    };
  });
}

/**
 * Remove all demo data for the given company
 *
 * Reads IDs from company.settings.demo_data_ids and deletes all records
 * in a single transaction, then clears the demo_data flags from settings.
 */
export async function removeDemoData(companyId: number): Promise<void> {
  return db.transaction(async (tx) => {
    // Read demo data IDs from company settings
    const [company] = await tx
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) return;

    const settings = company.settings as Record<string, unknown> | null;
    const demoDataIds = settings?.demo_data_ids as DemoDataIds | undefined;

    if (!demoDataIds) return;

    // Delete bookings
    if (demoDataIds.booking_ids?.length > 0) {
      await tx.delete(bookings).where(inArray(bookings.id, demoDataIds.booking_ids));
    }

    // Delete customers
    if (demoDataIds.customer_ids?.length > 0) {
      await tx.delete(customers).where(inArray(customers.id, demoDataIds.customer_ids));
    }

    // Delete services
    if (demoDataIds.service_ids?.length > 0) {
      await tx.delete(services).where(inArray(services.id, demoDataIds.service_ids));
    }

    // Clear demo_data flags from company settings
    const { demo_data: _removed, demo_data_ids: _ids, ...cleanSettings } = settings ?? {};

    await tx
      .update(companies)
      .set({
        settings: cleanSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));
  });
}
