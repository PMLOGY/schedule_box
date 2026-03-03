/**
 * Public Booking Create Endpoint
 * POST /api/v1/public/company/[slug]/bookings - Create a booking without authentication
 *
 * This is the core public booking API. Visitors can book appointments without
 * having an account. The endpoint:
 * 1. Validates input with Zod
 * 2. Resolves company by slug
 * 3. Resolves service by UUID
 * 4. Finds or creates a customer record by email + company_id
 * 5. Creates a booking with double-booking prevention (SELECT FOR UPDATE)
 * 6. Returns the created booking details
 */

import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  companies,
  services,
  employees,
  employeeServices,
  customers,
  bookings,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { AppError, NotFoundError, ValidationError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';
import { publishEvent, createBookingCreatedEvent } from '@schedulebox/events';
import { checkBookingLimit, incrementBookingCounter } from '@/lib/usage/usage-service';
import { z } from 'zod';
import { lt, gt, or } from 'drizzle-orm';

// ============================================================================
// SCHEMAS
// ============================================================================

const companySlugParamSchema = z.object({
  slug: z.string().min(1),
});

type CompanySlugParam = z.infer<typeof companySlugParamSchema>;

/**
 * Public booking request body schema
 * Uses UUIDs for service_id and employee_id (public-facing)
 */
const publicBookingCreateSchema = z.object({
  service_id: z.string().uuid('Invalid service ID'),
  employee_id: z.string().uuid('Invalid employee ID').optional(),
  start_time: z.string().datetime('Invalid datetime format'),
  customer_name: z.string().min(1, 'Name is required').max(255),
  customer_email: z.string().email('Invalid email address').max(255),
  customer_phone: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

type PublicBookingCreate = z.infer<typeof publicBookingCreateSchema>;

// ============================================================================
// POST /api/v1/public/company/[slug]/bookings
// ============================================================================

export const POST = createRouteHandler<PublicBookingCreate, CompanySlugParam>({
  requiresAuth: false,
  bodySchema: publicBookingCreateSchema,
  paramsSchema: companySlugParamSchema,
  handler: async ({ body, params }) => {
    const { slug } = params;

    // 1. Resolve company by slug
    const company = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
      columns: {
        id: true,
        uuid: true,
        name: true,
        timezone: true,
      },
    });

    if (!company) {
      throw new NotFoundError(`Company not found: ${slug}`);
    }

    const companyId = company.id;

    // Check booking limit for company's plan tier
    await checkBookingLimit(companyId);

    // Parse start time
    const startTime = new Date(body.start_time);

    // 2. Resolve service by UUID within company scope
    const [service] = await db
      .select({
        id: services.id,
        uuid: services.uuid,
        companyId: services.companyId,
        name: services.name,
        durationMinutes: services.durationMinutes,
        bufferBeforeMinutes: services.bufferBeforeMinutes,
        bufferAfterMinutes: services.bufferAfterMinutes,
        price: services.price,
        currency: services.currency,
        isActive: services.isActive,
      })
      .from(services)
      .where(
        and(
          eq(services.uuid, body.service_id),
          eq(services.companyId, companyId),
          isNull(services.deletedAt),
        ),
      )
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (!service.isActive) {
      throw new ValidationError('Service is not active');
    }

    // 3. Calculate end time
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // 4. Resolve employee (by UUID or auto-assign)
    let employeeId: number;
    let employeeUuid: string;
    let employeeName: string;

    if (body.employee_id) {
      // Verify provided employee
      const [employee] = await db
        .select({
          id: employees.id,
          uuid: employees.uuid,
          name: employees.name,
          isActive: employees.isActive,
        })
        .from(employees)
        .where(
          and(
            eq(employees.uuid, body.employee_id),
            eq(employees.companyId, companyId),
            isNull(employees.deletedAt),
          ),
        )
        .limit(1);

      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      if (!employee.isActive) {
        throw new ValidationError('Employee is not active');
      }

      // Verify employee is assigned to this service
      const [assignment] = await db
        .select({ employeeId: employeeServices.employeeId })
        .from(employeeServices)
        .where(
          and(
            eq(employeeServices.employeeId, employee.id),
            eq(employeeServices.serviceId, service.id),
          ),
        )
        .limit(1);

      if (!assignment) {
        throw new ValidationError('Employee is not assigned to this service');
      }

      employeeId = employee.id;
      employeeUuid = employee.uuid;
      employeeName = employee.name;
    } else {
      // Auto-assign first available employee
      const availableEmployees = await db
        .select({
          id: employees.id,
          uuid: employees.uuid,
          name: employees.name,
        })
        .from(employees)
        .innerJoin(employeeServices, eq(employees.id, employeeServices.employeeId))
        .where(
          and(
            eq(employees.companyId, companyId),
            eq(employees.isActive, true),
            isNull(employees.deletedAt),
            eq(employeeServices.serviceId, service.id),
          ),
        )
        .limit(1);

      if (availableEmployees.length === 0) {
        throw new ValidationError('No available employees for this service');
      }

      const firstEmployee = availableEmployees[0];
      employeeId = firstEmployee.id;
      employeeUuid = firstEmployee.uuid;
      employeeName = firstEmployee.name;
    }

    // 5. Find or create customer by email + company_id
    let customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.email, body.customer_email),
        eq(customers.companyId, companyId),
        isNull(customers.deletedAt),
      ),
      columns: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!customer) {
      // Create new customer
      const [newCustomer] = await db
        .insert(customers)
        .values({
          companyId,
          name: body.customer_name,
          email: body.customer_email,
          phone: body.customer_phone || null,
          source: 'online',
        })
        .returning({
          id: customers.id,
          uuid: customers.uuid,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        });
      customer = newCustomer;
    } else {
      // Update customer name and phone if changed
      if (
        customer.name !== body.customer_name ||
        (body.customer_phone && customer.phone !== body.customer_phone)
      ) {
        await db
          .update(customers)
          .set({
            name: body.customer_name,
            ...(body.customer_phone ? { phone: body.customer_phone } : {}),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));
      }
    }

    // 6. Create booking with double-booking prevention (transaction with SELECT FOR UPDATE)
    const booking = await db.transaction(async (tx) => {
      // Lock employee row
      await tx
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .for('update');

      // Check for conflicts with buffer times
      const bufferBefore = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
      const bufferAfter = (service.bufferAfterMinutes ?? 0) * 60 * 1000;
      const bufferedStart = new Date(startTime.getTime() - bufferBefore);
      const bufferedEnd = new Date(endTime.getTime() + bufferAfter);

      const conflictingBookings = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.employeeId, employeeId),
            eq(bookings.companyId, companyId),
            or(
              eq(bookings.status, 'pending'),
              eq(bookings.status, 'confirmed'),
              eq(bookings.status, 'completed'),
            ),
            lt(bookings.startTime, bufferedEnd),
            gt(bookings.endTime, bufferedStart),
          ),
        )
        .limit(1);

      if (conflictingBookings.length > 0) {
        throw new AppError('SLOT_TAKEN', 'Time slot is already booked', 409);
      }

      // Insert booking
      const [insertedBooking] = await tx
        .insert(bookings)
        .values({
          companyId,
          customerId: customer!.id,
          serviceId: service.id,
          employeeId,
          startTime,
          endTime,
          status: 'pending',
          source: 'online',
          notes: body.notes || null,
          price: service.price,
          currency: service.currency,
          discountAmount: '0',
        })
        .returning();

      return insertedBooking;
    });

    // 7. Publish booking.created domain event (fire-and-forget)
    try {
      await publishEvent(
        createBookingCreatedEvent({
          bookingUuid: booking.uuid,
          companyId: booking.companyId,
          customerUuid: customer!.uuid,
          serviceUuid: service.uuid,
          employeeUuid: employeeUuid,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          status: 'pending',
          source: 'online',
          price: booking.price,
          currency: booking.currency ?? 'CZK',
        }),
      );
    } catch (error) {
      console.error('[Public Booking] Failed to publish booking.created event:', error);
    }

    // 8. Increment booking counter (fire-and-forget)
    incrementBookingCounter(companyId).catch((err) => {
      console.error('[Public Booking] Failed to increment booking counter:', err);
    });

    // 9. Return public-safe booking response
    return successResponse(
      {
        id: booking.uuid,
        status: 'pending',
        service: {
          id: service.uuid,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          currency: service.currency,
        },
        employee: {
          id: employeeUuid,
          name: employeeName,
        },
        customer: {
          name: body.customer_name,
          email: body.customer_email,
          phone: body.customer_phone || null,
        },
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        notes: body.notes || null,
        createdAt: booking.createdAt?.toISOString() ?? new Date().toISOString(),
      },
      201,
    );
  },
});
