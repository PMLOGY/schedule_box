/**
 * POST /api/v1/admin/fix-encoding
 * One-time admin endpoint to fix Czech encoding mojibake in company/service names.
 * Requires admin role. Safe to call multiple times (idempotent).
 */

import { sql } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { ForbiddenError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';

export const POST = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }
    const results: string[] = [];

    // Fix company names by slug (unconditional SET — idempotent)
    await db.execute(
      sql`UPDATE companies SET name = 'Salon Krása', description = 'Moderní beauty salon v centru Prahy' WHERE slug = 'salon-krasa'`,
    );
    results.push('Updated salon-krasa company name');

    await db.execute(
      sql`UPDATE companies SET name = 'Pánské holičství U Brouska', description = 'Tradiční pánské holičství' WHERE slug = 'panske-holicstvi-u-brouska'`,
    );
    results.push('Updated u-brouska company name');

    await db.execute(
      sql`UPDATE companies SET description = 'Moderní fitness centrum s osobním tréninkem' WHERE slug = 'fitzone-gym'`,
    );
    results.push('Updated fitzone-gym description');

    // Fix service names for salon-krasa
    const companyResult = await db.execute(
      sql`SELECT id FROM companies WHERE slug = 'salon-krasa' LIMIT 1`,
    );
    const companyId = (companyResult as unknown as { rows: { id: number }[] }).rows?.[0]?.id;

    if (companyId) {
      const serviceFixMap = [
        ['Střih vlasů', 'Střih vlasů - profesionální služba', '%stri%vlas%'],
        ['Barvení vlasů', 'Barvení vlasů - profesionální služba', '%barven%vlas%'],
        ['Melírování', 'Melírování - profesionální služba', '%mel_rov%'],
        ['Manikúra', 'Manikúra - profesionální služba', '%manik_ra%'],
        ['Pedikúra', 'Pedikúra - profesionální služba', '%pedik_ra%'],
        ['Masáž obličeje', 'Masáž obličeje - profesionální služba', '%mas%obli%'],
        ['Gelové nehty', 'Gelové nehty - profesionální služba', '%gel%neht%'],
      ];

      for (const [name, desc, pattern] of serviceFixMap) {
        await db.execute(
          sql`UPDATE services SET name = ${name}, description = ${desc} WHERE company_id = ${companyId} AND LOWER(name) LIKE ${pattern}`,
        );
      }
      results.push(`Fixed ${serviceFixMap.length} service names for company ${companyId}`);
    }

    return successResponse({ message: 'Encoding fix applied', results });
  },
});
