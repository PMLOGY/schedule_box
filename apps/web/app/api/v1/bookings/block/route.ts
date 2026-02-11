/**
 * POST /api/v1/bookings/block - Create a time block
 * GET /api/v1/bookings/block - List blocked slots
 * DELETE /api/v1/bookings/block - Remove a time block
 *
 * Admin endpoints for blocking employee time slots (vacations, maintenance, etc.)
 * Blocked time automatically excluded from availability engine results.
 *
 * Note: Full-day blocks (vacations, day off) should use the existing
 * POST /api/v1/employees/:id/schedule-overrides endpoint with is_day_off=true.
 * This endpoint is for partial-day blocks (e.g., lunch break, equipment maintenance).
 */

import { z } from 'zod';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { blockTimeSlot, listBlockedSlots, unblockTimeSlot } from '@/lib/booking/time-blocking';
import { ValidationError } from '@schedulebox/shared';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const blockTimeSlotSchema = z.object({
  employee_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  reason: z.string().max(255).optional(),
});

const listBlockedSlotsQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

const deleteTimeBlockQuerySchema = z.object({
  override_id: z.coerce.number().int().positive(),
});

// ============================================================================
// POST - Create time block
// ============================================================================

/**
 * Create a time block for an employee
 * Splits working hours around the blocked period
 *
 * Example: Employee works 9:00-17:00
 * POST { employee_id: 1, date: "2026-02-15", start_time: "12:00", end_time: "13:00" }
 * Result: Creates overrides for 9:00-12:00 and 13:00-17:00
 */
export const POST = createRouteHandler({
  bodySchema: blockTimeSlotSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Validate date is not in the past
    const blockDate = new Date(body.date + 'T00:00:00Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (blockDate < today) {
      throw new ValidationError('Cannot block time in the past');
    }

    // Validate end_time > start_time
    if (body.start_time >= body.end_time) {
      throw new ValidationError('End time must be after start time');
    }

    // Create time block
    const result = await blockTimeSlot(
      {
        employeeId: body.employee_id,
        date: body.date,
        blockStartTime: body.start_time,
        blockEndTime: body.end_time,
        reason: body.reason,
      },
      companyId,
    );

    return successResponse(
      {
        override_ids: result.overrideIds,
        blocked_periods: result.blockedPeriods,
        employee_id: body.employee_id,
        date: body.date,
        reason: body.reason,
      },
      201,
    );
  },
});

// ============================================================================
// GET - List blocked slots
// ============================================================================

/**
 * List blocked time slots for an employee within a date range
 * Returns schedule overrides that represent blocked time
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Parse and validate query parameters
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employee_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');

    const queryParams = listBlockedSlotsQuerySchema.parse({
      employee_id: employeeId,
      date_from: dateFrom,
      date_to: dateTo,
    });

    // Validate date range
    if (queryParams.date_from > queryParams.date_to) {
      throw new ValidationError('date_from must be before or equal to date_to');
    }

    // List blocked slots
    const blockedSlots = await listBlockedSlots(
      queryParams.employee_id,
      queryParams.date_from,
      queryParams.date_to,
      companyId,
    );

    return successResponse({
      blocks: blockedSlots,
      employee_id: queryParams.employee_id,
      date_range: {
        from: queryParams.date_from,
        to: queryParams.date_to,
      },
    });
  },
});

// ============================================================================
// DELETE - Remove time block
// ============================================================================

/**
 * Remove a time block by deleting the schedule override
 * Restores original working hours for the date
 *
 * Query params: ?override_id=123
 */
export const DELETE = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_DELETE],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Parse and validate query parameters
    const url = new URL(req.url);
    const overrideId = url.searchParams.get('override_id');

    const queryParams = deleteTimeBlockQuerySchema.parse({
      override_id: overrideId,
    });

    // Remove time block
    await unblockTimeSlot(queryParams.override_id, companyId);

    return noContentResponse();
  },
});
