/**
 * Customer Import Endpoint
 * POST /api/v1/customers/import - Import customers from CSV
 */

import * as Papa from 'papaparse';
import { db, customers } from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { customerImportRowSchema } from '@/validations/customer';

/**
 * POST /api/v1/customers/import
 * Import customers from CSV file with batch processing and duplicate handling
 *
 * Request: multipart/form-data with 'file' field containing CSV
 * CSV columns: name, email, phone, date_of_birth, notes
 *
 * Response: { imported: number, skipped: number, errors: Array<{row: number, error: string}>, total_rows: number }
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_CREATE],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Extract file from FormData
    const formData = await req.formData();
    const file = formData.get('file');

    // Validate file presence and type
    if (!file || !(file instanceof File)) {
      throw new ValidationError('CSV file is required');
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size exceeds 10MB limit');
    }

    // Read file content as text
    const text = await file.text();

    // Parse CSV with PapaParse
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
    });

    // Initialize results
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Validate max rows (500,000 limit)
    const MAX_ROWS = 500000;
    if (parsed.data.length > MAX_ROWS) {
      throw new ValidationError('CSV exceeds 500,000 row limit');
    }

    // Process rows and validate
    const BATCH_SIZE = 1000;
    const validRows: Array<{
      name: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      notes?: string;
      companyId: number;
      source: string;
    }> = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const validation = customerImportRowSchema.safeParse(row);

      if (!validation.success) {
        results.errors.push({ row: i + 2, error: validation.error.issues[0].message });
        results.skipped++;

        // Cap errors at 100 to prevent response from being too large
        if (results.errors.length >= 100) {
          results.errors.push({
            row: 0,
            error: `Error reporting capped at 100. ${parsed.data.length - i - 1} remaining rows not checked.`,
          });
          break;
        }
        continue;
      }

      validRows.push({
        name: validation.data.name,
        email: validation.data.email,
        phone: validation.data.phone,
        dateOfBirth: validation.data.date_of_birth,
        notes: validation.data.notes,
        companyId,
        source: 'import',
      });
    }

    // Batch insert valid rows with duplicate handling
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const chunk = validRows.slice(i, i + BATCH_SIZE);
      await db
        .insert(customers)
        .values(chunk)
        .onConflictDoNothing({ target: [customers.companyId, customers.email] });
      // Note: onConflictDoNothing means duplicates are silently skipped
      // We count all valid rows as "imported" (includes skipped duplicates)
    }
    results.imported = validRows.length;

    return successResponse({
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      total_rows: parsed.data.length,
    });
  },
});
