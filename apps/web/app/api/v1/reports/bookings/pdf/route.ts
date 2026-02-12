import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { db, bookings } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { and, eq, gte, sql } from 'drizzle-orm';
import { BookingReport } from '@/lib/export/pdf-templates/booking-report';

const querySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query params
    const searchParams = req.nextUrl.searchParams;
    const { days } = querySchema.parse({
      days: searchParams.get('days'),
    });

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Query booking stats grouped by date
    const rawData = await db
      .select({
        date: sql<string>`DATE(${bookings.startTime})`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .where(and(eq(bookings.companyId, companyId), gte(bookings.startTime, startDate)))
      .groupBy(sql`DATE(${bookings.startTime})`)
      .orderBy(sql`DATE(${bookings.startTime})`);

    // Convert to expected format
    const data = rawData.map((row) => ({
      date: row.date,
      completed: Number(row.completed),
      cancelled: Number(row.cancelled),
      noShows: Number(row.noShows),
      total: Number(row.total),
    }));

    // Compute totals
    const totals = data.reduce(
      (acc, row) => ({
        completed: acc.completed + row.completed,
        cancelled: acc.cancelled + row.cancelled,
        noShows: acc.noShows + row.noShows,
        total: acc.total + row.total,
      }),
      { completed: 0, cancelled: 0, noShows: 0, total: 0 },
    );

    // Build period string
    const endDate = new Date();
    const period = `${startDate.toLocaleDateString('cs-CZ')} - ${endDate.toLocaleDateString('cs-CZ')}`;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      BookingReport({
        data,
        period,
        totals,
      }),
    );

    // Generate filename
    const filename = `bookings-report-${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF as downloadable file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
