/**
 * Error handling utilities for Next.js API routes
 */

import { type NextResponse } from 'next/server';
import { AppError, InternalError } from '@schedulebox/shared';
import { errorResponse } from './response.js';

/**
 * Centralized error handler for API route handlers
 * Converts any error into a standardized error response
 *
 * @param error - Error thrown in route handler
 * @returns NextResponse with error details
 */
export function handleRouteError(error: unknown): NextResponse {
  // Known AppError instances
  if (error instanceof AppError) {
    return errorResponse(error);
  }

  // Standard JavaScript errors
  if (error instanceof Error) {
    console.error('Unhandled Error:', error.message, error.stack);
    return errorResponse(
      new InternalError('An unexpected error occurred', {
        message: error.message,
      }),
    );
  }

  // Unknown error type
  console.error('Unknown Error:', error);
  return errorResponse(new InternalError('An unexpected error occurred'));
}
