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
import { type Span, trace } from '@opentelemetry/api';
import {
  db,
  dbTx,
  companies,
  services,
  employees,
  employeeServices,
  customers,
  bookings,
  loyaltyCards,
  loyaltyPrograms,
  rewards,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { AppError, NotFoundError, ValidationError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';
import { publishEvent, createBookingCreatedEvent } from '@schedulebox/events';
import { checkBookingLimit, incrementBookingCounter } from '@/lib/usage/usage-service';
import { redeemPoints } from '@/lib/loyalty/points-engine';
import { z } from 'zod';
import { lt, gt, or, sql } from 'drizzle-orm';
import { encrypt, hmacIndex } from '@/lib/security/encryption';
import { triggerWebhooks } from '@/lib/webhooks/trigger';
import { logRouteComplete, getRequestId } from '@/lib/logger/route-logger';

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
  reward_id: z.number().int().positive().optional(),
});

type PublicBookingCreate = z.infer<typeof publicBookingCreateSchema>;

// ============================================================================
// POST /api/v1/public/company/[slug]/bookings
// ============================================================================

export const POST = createRouteHandler<PublicBookingCreate, CompanySlugParam>({
  requiresAuth: false,
  bodySchema: publicBookingCreateSchema,
  paramsSchema: companySlugParamSchema,
  handler: async ({ body, params, req }) => {
    const startTime = Date.now();
    const requestId = getRequestId(req);
    const { slug } = params;

    return trace
      .getTracer('schedulebox')
      .startActiveSpan('schedulebox.booking.create', async (span) => {
        span.setAttributes({
          'http.route': `/api/v1/public/company/${slug}/bookings`,
          'booking.company_slug': slug,
        });
        try {
          return await _handlePublicBookingCreate({
            body,
            slug,
            span,
            reqStartTime: startTime,
            requestId,
          });
        } catch (error) {
          span.recordException(error as Error);
          span.end();
          logRouteComplete({
            route: `/api/v1/public/company/${slug}/bookings`,
            method: 'POST',
            status: 500,
            duration_ms: Date.now() - startTime,
            request_id: requestId,
            error: error as Error,
          });
          throw error;
        }
      });
  },
});

// ============================================================================
// Internal handler — extracted so the span wrapper stays readable
// ============================================================================

async function _handlePublicBookingCreate({
  body,
  slug,
  span,
  reqStartTime,
  requestId,
}: {
  body: PublicBookingCreate;
  slug: string;
  span: Span;
  reqStartTime: number;
  requestId: string;
}) {
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
  // Prefer HMAC lookup when ENCRYPTION_KEY is set (handles encrypted rows)
  const encKey = process.env.ENCRYPTION_KEY ?? null;
  const emailHmac = encKey ? hmacIndex(body.customer_email, encKey) : null;

  // Try HMAC lookup first (encrypted rows), then fall back to plaintext
  let customer = emailHmac
    ? await db.query.customers.findFirst({
        where: and(
          eq(customers.emailHmac, emailHmac),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
        columns: { id: true, uuid: true, name: true, email: true, phone: true },
      })
    : null;

  if (!customer) {
    // Fall back to plaintext lookup (rows not yet back-filled or no encryption key)
    customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.email, body.customer_email),
        eq(customers.companyId, companyId),
        isNull(customers.deletedAt),
      ),
      columns: { id: true, uuid: true, name: true, email: true, phone: true },
    });
  }

  if (!customer) {
    // Create new customer — dual-write: plaintext + ciphertext (expand phase)
    const encryptedFields =
      encKey !== null
        ? {
            emailCiphertext: encrypt(body.customer_email, encKey),
            phoneCiphertext: body.customer_phone ? encrypt(body.customer_phone, encKey) : null,
            emailHmac: hmacIndex(body.customer_email, encKey),
          }
        : {};

    const [newCustomer] = await db
      .insert(customers)
      .values({
        companyId,
        name: body.customer_name,
        email: body.customer_email,
        phone: body.customer_phone || null,
        source: 'online',
        ...encryptedFields,
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
    // Update customer name and phone if changed — dual-write phone ciphertext too
    if (
      customer.name !== body.customer_name ||
      (body.customer_phone && customer.phone !== body.customer_phone)
    ) {
      const updatedPhoneFields =
        encKey !== null && body.customer_phone
          ? { phoneCiphertext: encrypt(body.customer_phone, encKey) }
          : {};

      await db
        .update(customers)
        .set({
          name: body.customer_name,
          ...(body.customer_phone ? { phone: body.customer_phone } : {}),
          updatedAt: new Date(),
          ...updatedPhoneFields,
        })
        .where(eq(customers.id, customer.id));
    }
  }

  // 6a. Apply loyalty reward discount (if reward_id provided)
  let discountAmount = '0';

  if (body.reward_id) {
    // Find the company's active loyalty program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.companyId, companyId), eq(loyaltyPrograms.isActive, true)))
      .limit(1);

    if (!program) {
      throw new ValidationError('No active loyalty program found for this company');
    }

    // Find customer's loyalty card
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        pointsBalance: loyaltyCards.pointsBalance,
        programId: loyaltyCards.programId,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.programId, program.id), eq(loyaltyCards.customerId, customer!.id)))
      .limit(1);

    if (!card) {
      throw new ValidationError('No loyalty card found for this customer');
    }

    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    // Look up and validate the reward
    const [reward] = await db
      .select({
        id: rewards.id,
        programId: rewards.programId,
        pointsCost: rewards.pointsCost,
        rewardType: rewards.rewardType,
        rewardValue: rewards.rewardValue,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
        isActive: rewards.isActive,
      })
      .from(rewards)
      .where(eq(rewards.id, body.reward_id))
      .limit(1);

    if (!reward) {
      throw new ValidationError('Reward not found');
    }

    if (!reward.isActive) {
      throw new ValidationError('Reward is not active');
    }

    // Verify reward belongs to the company's program
    if (reward.programId !== program.id) {
      throw new ValidationError('Reward does not belong to this company loyalty program');
    }

    // Verify reward stock
    if (
      reward.maxRedemptions !== null &&
      (reward.currentRedemptions ?? 0) >= reward.maxRedemptions
    ) {
      throw new ValidationError('Reward no longer available (redemption limit reached)');
    }

    // Verify customer has enough points
    const pointsBalance = card.pointsBalance ?? 0;
    if (pointsBalance < reward.pointsCost) {
      throw new ValidationError(
        `Insufficient points balance. Have: ${pointsBalance}, Need: ${reward.pointsCost}`,
      );
    }

    // Calculate discount amount
    const servicePrice = parseFloat(service.price ?? '0');
    const rewardValue = parseFloat(reward.rewardValue ?? '0');

    if (reward.rewardType === 'discount_percentage') {
      discountAmount = ((servicePrice * rewardValue) / 100).toFixed(2);
    } else if (reward.rewardType === 'discount_fixed') {
      discountAmount = Math.min(rewardValue, servicePrice).toFixed(2);
    }
    // free_service and gift types do not produce a numeric discount amount here

    // Deduct points from card
    await redeemPoints(card.id, reward.pointsCost, `Redeemed reward: ${body.reward_id}`);

    // Increment reward current_redemptions counter
    await db
      .update(rewards)
      .set({
        currentRedemptions: sql`${rewards.currentRedemptions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(rewards.id, reward.id));
  }

  // 6. Create booking with double-booking prevention (transaction with SELECT FOR UPDATE)
  const booking = await dbTx.transaction(async (tx) => {
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
        discountAmount,
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

  // 8a. Trigger webhooks for booking.created (fire-and-forget)
  void triggerWebhooks(companyId, 'booking.created', {
    booking_id: booking.uuid,
    customer_name: body.customer_name,
    service_name: service.name,
    start_time: booking.startTime.toISOString(),
    status: 'pending',
  });

  // 9. Return public-safe booking response
  const response = successResponse(
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

  span.setAttributes({ 'booking.service_id': body.service_id });
  span.end();
  logRouteComplete({
    route: `/api/v1/public/company/${slug}/bookings`,
    method: 'POST',
    status: 201,
    duration_ms: Date.now() - reqStartTime,
    request_id: requestId,
  });
  return response;
}
