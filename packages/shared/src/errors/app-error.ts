/**
 * Base application error class for ScheduleBox
 * All API errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly (required for extending built-ins in TypeScript)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super('UNAUTHORIZED', message, 401, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details?: unknown) {
    super('FORBIDDEN', message, 403, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super('NOT_FOUND', message, 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 400 Bad Request - Invalid input validation
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate email)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super('CONFLICT', message, 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super('INTERNAL_ERROR', message, 500, details);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * 400 Bad Request - Malformed request
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super('BAD_REQUEST', message, 400, details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 501 Not Implemented - Feature not yet implemented
 */
export class NotImplementedError extends AppError {
  constructor(message = 'Feature not implemented', details?: unknown) {
    super('NOT_IMPLEMENTED', message, 501, details);
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
