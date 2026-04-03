import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { db, customers } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { and, eq, sql, isNull } from 'drizzle-orm';
import { registerFonts, formatPdfDate } from '@/lib/export/pdf-templates/pdf-config';
import { CustomerReport } from '@/lib/export/pdf-templates/customer-report';

const querySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
  locale: z.enum(['cs', 'sk', 'en']).default('cs'),
});

export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const searchParams = req.nextUrl.searchParams;
    const { days, locale } = querySchema.parse({
      days: searchParams.get('days'),
      locale: searchParams.get('locale'),
    });

    // Date thresholds for churn analysis
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const oneEightyDaysAgo = new Date(now);
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

    // Repeat Booking Rate
    const [repeatBookingResult] = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)::int`,
        repeatCustomers: sql<number>`COUNT(*) FILTER (WHERE ${customers.totalBookings} > 1)::int`,
      })
      .from(customers)
      .where(and(eq(customers.companyId, companyId), isNull(customers.deletedAt)));

    const totalCustomers = repeatBookingResult?.totalCustomers ?? 0;
    const repeatCustomers = repeatBookingResult?.repeatCustomers ?? 0;
    const repeatRate =
      totalCustomers > 0 ? Number((repeatCustomers / totalCustomers).toFixed(4)) : 0;

    // Customer Churn
    const ninetyDaysAgoISO = ninetyDaysAgo.toISOString();
    const oneEightyDaysAgoISO = oneEightyDaysAgo.toISOString();

    const [churnResult] = await db
      .select({
        churned: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} IS NULL OR ${customers.lastVisitAt} <= ${oneEightyDaysAgoISO})::int`,
        atRisk: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} > ${oneEightyDaysAgoISO} AND ${customers.lastVisitAt} <= ${ninetyDaysAgoISO})::int`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} > ${ninetyDaysAgoISO})::int`,
      })
      .from(customers)
      .where(and(eq(customers.companyId, companyId), isNull(customers.deletedAt)));

    // CLV Distribution
    const clvResults = await db
      .select({
        range: sql<string>`CASE
          WHEN ${customers.clvPredicted}::numeric < 500 THEN '0-500'
          WHEN ${customers.clvPredicted}::numeric < 2000 THEN '500-2000'
          WHEN ${customers.clvPredicted}::numeric < 5000 THEN '2000-5000'
          WHEN ${customers.clvPredicted}::numeric < 10000 THEN '5000-10000'
          ELSE '10000+'
        END`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(customers)
      .where(
        and(
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
          sql`${customers.clvPredicted} IS NOT NULL`,
        ),
      ).groupBy(sql`CASE
        WHEN ${customers.clvPredicted}::numeric < 500 THEN '0-500'
        WHEN ${customers.clvPredicted}::numeric < 2000 THEN '500-2000'
        WHEN ${customers.clvPredicted}::numeric < 5000 THEN '2000-5000'
        WHEN ${customers.clvPredicted}::numeric < 10000 THEN '5000-10000'
        ELSE '10000+'
      END`).orderBy(sql`CASE
        WHEN ${customers.clvPredicted}::numeric < 500 THEN 1
        WHEN ${customers.clvPredicted}::numeric < 2000 THEN 2
        WHEN ${customers.clvPredicted}::numeric < 5000 THEN 3
        WHEN ${customers.clvPredicted}::numeric < 10000 THEN 4
        ELSE 5
      END`);

    // Build period string
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const period = `${formatPdfDate(startDate.toISOString(), locale)} - ${formatPdfDate(now.toISOString(), locale)}`;

    // Register fonts with Czech diacritics support
    registerFonts();

    const pdfBuffer = await renderToBuffer(
      CustomerReport({
        data: {
          repeatRate,
          totalCustomers,
          repeatCustomers,
          churned: churnResult?.churned ?? 0,
          atRisk: churnResult?.atRisk ?? 0,
          active: churnResult?.active ?? 0,
          clvDistribution: clvResults,
        },
        period,
        locale,
      }),
    );

    const filename = `customer-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
});
