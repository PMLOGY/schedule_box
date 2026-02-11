/**
 * Public Availability API Endpoint
 *
 * GET /api/v1/availability
 * Returns available booking slots for a service.
 *
 * This is a PUBLIC endpoint (no authentication required).
 * Customers can check availability before creating a booking.
 *
 * Query parameters:
 * - company_slug: Company slug
 * - service_id: Service ID
 * - employee_id: Optional employee ID filter
 * - date_from: Start date (YYYY-MM-DD)
 * - date_to: End date (YYYY-MM-DD)
 */

import { type NextRequest, type NextResponse } from 'next/server';
import { db, companies } from '@schedulebox/database';
import { eq } from 'drizzle-orm';
import { availabilityRequestSchema } from '@schedulebox/shared';
import { calculateAvailability } from '@/lib/booking/availability-engine';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError, ValidationError } from '@schedulebox/shared';

/**
 * GET /api/v1/availability
 *
 * Public endpoint to query available booking slots.
 * Does not require authentication.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters from URL
    const searchParams = req.nextUrl.searchParams;
    const queryParams: Record<string, string | null> = {
      company_slug: searchParams.get('company_slug'),
      service_id: searchParams.get('service_id'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
    };
    // Only include employee_id if provided (null coerces to 0, failing .positive())
    const employeeId = searchParams.get('employee_id');
    if (employeeId) {
      queryParams.employee_id = employeeId;
    }

    // Validate query parameters with Zod schema
    const validationResult = availabilityRequestSchema.safeParse(queryParams);

    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.flatten());
    }

    const params = validationResult.data;

    // Look up company by slug, or by UUID (for dashboard/internal use)
    let company = await db.query.companies.findFirst({
      where: eq(companies.slug, params.company_slug),
      columns: {
        id: true,
        timezone: true,
      },
    });

    if (!company) {
      // Fallback: try looking up by UUID (dashboard passes companyId UUID)
      company = await db.query.companies.findFirst({
        where: eq(companies.uuid, params.company_slug),
        columns: {
          id: true,
          timezone: true,
        },
      });
    }

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Calculate availability using the availability engine
    const slots = await calculateAvailability({
      companyId: company.id,
      serviceId: params.service_id,
      employeeId: params.employee_id,
      dateFrom: params.date_from,
      dateTo: params.date_to,
      timezone: company.timezone || 'Europe/Prague',
    });

    // Return slots in standard success response format
    return successResponse({ slots });
  } catch (error) {
    // Centralized error handling
    return handleRouteError(error);
  }
}
