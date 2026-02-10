/**
 * Zod validation middleware for Next.js API routes
 * Provides type-safe request validation with sanitized error messages
 */
import { type z } from 'zod';
import { type NextRequest } from 'next/server';
import { ValidationError } from '@schedulebox/shared';

/**
 * Sanitize Zod errors to prevent input value leakage
 * Returns only path and message, never the received values
 */
function sanitizeZodErrors(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Validate request body against Zod schema
 * @throws ValidationError with sanitized error details
 */
export async function validateBody<T>(schema: z.ZodSchema<T>, req: NextRequest): Promise<T> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      throw new ValidationError('Request body validation failed', {
        errors: sanitizeZodErrors(result.error),
      });
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    // Handle JSON parse errors
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Validate URL query parameters against Zod schema
 * @throws ValidationError with sanitized error details
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, req: NextRequest): T {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    throw new ValidationError('Query parameter validation failed', {
      errors: sanitizeZodErrors(result.error),
    });
  }

  return result.data;
}

/**
 * Validate route parameters against Zod schema
 * @throws ValidationError with sanitized error details
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw new ValidationError('Route parameter validation failed', {
      errors: sanitizeZodErrors(result.error),
    });
  }

  return result.data;
}
