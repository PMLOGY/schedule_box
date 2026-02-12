import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { db, dailyBookingSummary } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { and, eq, gte } from 'drizzle-orm';
import { RevenueReport } from '@/lib/export/pdf-templates/revenue-report';

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

    // Query daily booking summary
    const data = await db
      .select({
        date: dailyBookingSummary.bookingDate,
        revenue: dailyBookingSummary.totalRevenue,
        bookings: dailyBookingSummary.totalBookings,
      })
      .from(dailyBookingSummary)
      .where(
        and(
          eq(dailyBookingSummary.companyId, companyId),
          gte(dailyBookingSummary.bookingDate, startDate.toISOString().split('T')[0]),
        ),
      )
      .orderBy(dailyBookingSummary.bookingDate);

    // Convert revenue to number and compute totals (handle null values from FILTER clause)
    const processedData = data.map((row) => ({
      date: row.date,
      revenue: row.revenue ?? 0,
      bookings: row.bookings,
    }));

    const totals = processedData.reduce(
      (acc, row) => ({
        totalRevenue: acc.totalRevenue + row.revenue,
        totalBookings: acc.totalBookings + row.bookings,
        avgRevenue: 0, // Will be calculated after
      }),
      { totalRevenue: 0, totalBookings: 0, avgRevenue: 0 },
    );

    totals.avgRevenue = processedData.length > 0 ? totals.totalRevenue / processedData.length : 0;

    // Build period string
    const endDate = new Date();
    const period = `${startDate.toLocaleDateString('cs-CZ')} - ${endDate.toLocaleDateString('cs-CZ')}`;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      RevenueReport({
        data: processedData,
        period,
        totals,
      }),
    );

    // Generate filename
    const filename = `revenue-report-${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF as downloadable file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
