/**
 * Booking Calendar Export Endpoint
 * GET /api/v1/bookings/:id/calendar - Download ICS calendar file for a booking
 *
 * Public endpoint — booking UUID serves as unguessable identifier.
 * No JWT auth required (customers download their booking ICS via email link).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, bookings, services, companies, employees } from '@schedulebox/database';
import { generateICS } from '@/lib/booking/ics-generator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Query booking with related service, company, and employee data via joins
    const [booking] = await db
      .select({
        uuid: bookings.uuid,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        createdAt: bookings.createdAt,
        serviceName: services.name,
        serviceDuration: services.durationMinutes,
        servicePrice: services.price,
        serviceCurrency: services.currency,
        companyName: companies.name,
        companyEmail: companies.email,
        companyStreet: companies.addressStreet,
        companyCity: companies.addressCity,
        companyZip: companies.addressZip,
        employeeName: employees.name,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(companies, eq(bookings.companyId, companies.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(eq(bookings.uuid, id))
      .limit(1);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found', code: 'NOT_FOUND', message: 'Booking not found' },
        { status: 404 },
      );
    }

    // Build address string from company address parts
    const addressParts = [booking.companyStreet, booking.companyCity, booking.companyZip].filter(
      Boolean,
    );
    const location = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    // Build description with booking details
    const descriptionParts = [
      `Sluzba: ${booking.serviceName ?? 'N/A'}`,
      booking.employeeName ? `Zamestnanec: ${booking.employeeName}` : null,
      `Doba trvani: ${booking.serviceDuration ?? 0} min`,
      booking.servicePrice
        ? `Cena: ${parseFloat(booking.servicePrice).toFixed(0)} ${booking.serviceCurrency ?? 'CZK'}`
        : null,
      `Provozovna: ${booking.companyName ?? 'ScheduleBox'}`,
    ].filter(Boolean);

    const icsContent = generateICS({
      uid: booking.uuid,
      summary: `${booking.serviceName ?? 'Rezervace'} - ${booking.companyName ?? 'ScheduleBox'}`,
      description: descriptionParts.join('\n'),
      location,
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
      organizerName: booking.companyName ?? 'ScheduleBox',
      organizerEmail: booking.companyEmail ?? undefined,
      createdAt: new Date(booking.createdAt),
    });

    // Return as ICS file download
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="booking-${booking.uuid.slice(0, 8)}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate calendar file',
      },
      { status: 500 },
    );
  }
}
