/**
 * Public Availability Endpoint (UUID-based)
 *
 * GET /api/v1/public/company/[slug]/availability
 * Returns available booking slots for a service, accepting UUID-based service_id.
 *
 * This bridges the gap between the public-facing UUID identifiers
 * and the internal SERIAL ID-based availability engine.
 *
 * Query parameters:
 * - service_id: Service UUID (not internal ID)
 * - employee_id: Optional employee UUID filter
 * - date_from: Start date (YYYY-MM-DD)
 * - date_to: End date (YYYY-MM-DD)
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, companies, services, employees } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { NotFoundError, ValidationError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';
import { calculateAvailability } from '@/lib/booking/availability-engine';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const companySlugParamSchema = z.object({
  slug: z.string().min(1),
});

type CompanySlugParam = z.infer<typeof companySlugParamSchema>;

const availabilityQuerySchema = z
  .object({
    service_id: z.string().uuid('Invalid service ID'),
    employee_id: z.string().uuid('Invalid employee ID').optional(),
    date_from: z.string().date('Invalid date format (YYYY-MM-DD)'),
    date_to: z.string().date('Invalid date format (YYYY-MM-DD)'),
  })
  .refine(
    (data) => {
      const from = new Date(data.date_from);
      const to = new Date(data.date_to);
      return to >= from;
    },
    {
      message: 'date_to must be greater than or equal to date_from',
      path: ['date_to'],
    },
  )
  .refine(
    (data) => {
      const from = new Date(data.date_from);
      const to = new Date(data.date_to);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 31;
    },
    {
      message: 'date range must not exceed 31 days',
      path: ['date_to'],
    },
  );

// ============================================================================
// GET /api/v1/public/company/[slug]/availability
// ============================================================================

export const GET = createRouteHandler<undefined, CompanySlugParam>({
  requiresAuth: false,
  paramsSchema: companySlugParamSchema,
  handler: async ({ req, params }) => {
    const { slug } = params;

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const queryParams: Record<string, string | undefined> = {
      service_id: searchParams.get('service_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    const employeeIdParam = searchParams.get('employee_id');
    if (employeeIdParam) {
      queryParams.employee_id = employeeIdParam;
    }

    // Validate query
    const validationResult = availabilityQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.flatten());
    }

    const query = validationResult.data;

    // Resolve company by slug
    const company = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
      columns: {
        id: true,
        timezone: true,
      },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Resolve service UUID to internal ID
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(
        and(
          eq(services.uuid, query.service_id),
          eq(services.companyId, company.id),
          isNull(services.deletedAt),
        ),
      )
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Resolve employee UUID to internal ID if provided
    let employeeInternalId: number | undefined;
    if (query.employee_id) {
      const [employee] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.uuid, query.employee_id),
            eq(employees.companyId, company.id),
            isNull(employees.deletedAt),
          ),
        )
        .limit(1);

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }
      employeeInternalId = employee.id;
    }

    // Calculate availability using the engine
    const slots = await calculateAvailability({
      companyId: company.id,
      serviceId: service.id,
      employeeId: employeeInternalId,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      timezone: company.timezone || 'Europe/Prague',
    });

    return successResponse({ slots });
  },
});
