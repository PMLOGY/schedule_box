/**
 * Customer Import Endpoint (Scaffold)
 * POST /api/v1/customers/import - Import customers from CSV (not yet implemented)
 */

import { NextResponse } from 'next/server';

/**
 * POST /api/v1/customers/import
 * Scaffold for CSV import functionality
 * Returns 501 Not Implemented - full implementation will be added in CRM phase
 *
 * TODO: Implement CSV import with streaming parser for large files
 * - Parse CSV with papaparse or csv-parser
 * - Validate rows against customer schema
 * - Batch insert with duplicate detection
 * - Return import summary (created, updated, failed)
 */
export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'CSV import is not yet available',
        details: {
          planned_for: 'CRM phase',
          alternatives: ['Use POST /api/v1/customers to create customers individually'],
        },
      },
    },
    { status: 501 },
  );
}
