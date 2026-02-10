/**
 * Zod validation schemas for employee endpoints
 * Matches OpenAPI spec (lines 4724-4772)
 */

import { z } from 'zod';

/**
 * Employee creation schema
 * POST /api/v1/employees
 */
export const employeeCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  service_ids: z.array(z.number().int()).optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

/**
 * Employee update schema
 * PUT /api/v1/employees/[id]
 */
export const employeeUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional(),
});

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

/**
 * Employee services assignment schema
 * PUT /api/v1/employees/[id]/services
 */
export const employeeServicesSchema = z.object({
  service_ids: z.array(z.number().int()),
});

export type EmployeeServicesInput = z.infer<typeof employeeServicesSchema>;

/**
 * Working hours creation schema
 * PUT /api/v1/employees/[id]/working-hours
 */
export const workingHoursCreateSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    is_active: z.boolean().optional().default(true),
  }),
);

export type WorkingHoursCreateInput = z.infer<typeof workingHoursCreateSchema>;

/**
 * Schedule override (exception) schema
 * POST /api/v1/employees/[id]/schedule-overrides
 */
export const scheduleOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_day_off: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

export type ScheduleOverrideInput = z.infer<typeof scheduleOverrideSchema>;

/**
 * Employee ID param schema (UUID)
 */
export const employeeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type EmployeeIdParam = z.infer<typeof employeeIdParamSchema>;
