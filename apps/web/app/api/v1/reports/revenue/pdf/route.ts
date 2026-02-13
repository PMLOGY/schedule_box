import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { db, dailyBookingSummary } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { and, eq, gte } from 'drizzle-orm';
import { registerFonts, formatPdfDate } from '@/lib/export/pdf-templates/pdf-config';
import { RevenueReport } from '@/lib/export/pdf-templates/revenue-report';

const querySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  locale: z.enum(['cs', 'sk', 'en']).default('cs'),
});

export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const searchParams = req.nextUrl.searchParams;
    const { days, locale } = querySchema.parse({
      days: searchParams.get('days'),
      locale: searchParams.get('locale'),
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

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

    // Drizzle returns numeric/decimal columns as strings — convert to Number
    const processedData = data.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue) || 0,
      bookings: Number(row.bookings) || 0,
    }));

    const totals = processedData.reduce(
      (acc, row) => ({
        totalRevenue: acc.totalRevenue + row.revenue,
        totalBookings: acc.totalBookings + row.bookings,
        avgRevenue: 0,
      }),
      { totalRevenue: 0, totalBookings: 0, avgRevenue: 0 },
    );

    totals.avgRevenue = processedData.length > 0 ? totals.totalRevenue / processedData.length : 0;

    const endDate = new Date();
    const period = `${formatPdfDate(startDate.toISOString(), locale)} - ${formatPdfDate(endDate.toISOString(), locale)}`;

    // Register fonts with diacritics support before rendering
    registerFonts();

    const pdfBuffer = await renderToBuffer(
      RevenueReport({
        data: processedData,
        period,
        totals,
        locale,
      }),
    );

    const filename = `revenue-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
