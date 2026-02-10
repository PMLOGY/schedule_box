/**
 * Standard API response utilities for Next.js API routes
 * Ensures consistent response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { type AppError, type PaginationMeta } from '@schedulebox/shared';

/**
 * Standard success response
 * @param data - Response data
 * @param status - HTTP status code (default 200)
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Created response (201)
 * @param data - Created resource data
 */
export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201);
}

/**
 * No content response (204)
 * Used for successful operations that don't return data (e.g., DELETE)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Paginated response
 * @param data - Array of items
 * @param meta - Pagination metadata
 */
export function paginatedResponse<T>(data: T[], meta: PaginationMeta): NextResponse {
  return NextResponse.json({ data, meta });
}

/**
 * Error response from AppError instance
 * @param error - AppError instance
 */
export function errorResponse(error: AppError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode },
  );
}

/**
 * Validation error response
 * SECURITY: Never include raw input values in error details
 * @param errors - Array of validation errors with path and message
 */
export function validationErrorResponse(
  errors: Array<{ path: string; message: string }>,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { errors },
      },
    },
    { status: 400 },
  );
}
