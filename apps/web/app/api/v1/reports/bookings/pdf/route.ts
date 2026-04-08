import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { db, bookings } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { and, eq, gte, sql } from 'drizzle-orm';
import { registerFonts, formatPdfDate } from '@/lib/export/pdf-templates/pdf-config';
import { BookingReport } from '@/lib/export/pdf-templates/booking-report';

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
      days: searchParams.get('days') ?? undefined,
      locale: searchParams.get('locale') ?? undefined,
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

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

    const data = rawData.map((row) => ({
      date: row.date,
      completed: Number(row.completed) || 0,
      cancelled: Number(row.cancelled) || 0,
      noShows: Number(row.noShows) || 0,
      total: Number(row.total) || 0,
    }));

    const totals = data.reduce(
      (acc, row) => ({
        completed: acc.completed + row.completed,
        cancelled: acc.cancelled + row.cancelled,
        noShows: acc.noShows + row.noShows,
        total: acc.total + row.total,
      }),
      { completed: 0, cancelled: 0, noShows: 0, total: 0 },
    );

    const endDate = new Date();
    const period = `${formatPdfDate(startDate.toISOString(), locale)} - ${formatPdfDate(endDate.toISOString(), locale)}`;

    // Register fonts with diacritics support before rendering
    registerFonts();

    const pdfBuffer = await renderToBuffer(
      BookingReport({
        data,
        period,
        totals,
        locale,
      }),
    );

    const filename = `bookings-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
