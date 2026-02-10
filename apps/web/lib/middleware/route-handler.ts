/**
 * Route handler factory for Next.js API routes
 * Composable pattern combining auth, RBAC, validation, and error handling
 *
 * This is THE single pattern used by ALL protected API endpoints.
 */

import { type NextRequest, type NextResponse } from 'next/server';
import { type z } from 'zod';
import { authenticateRequest } from './auth';
import { checkPermissions } from './rbac';
import { validateBody, validateParams } from './validate';
import { handleRouteError } from '../utils/errors';
import { type JWTPayload } from '../auth/jwt';

/**
 * Context passed to route handler
 */
export interface RouteHandlerContext<TBody = undefined, TParams = undefined> {
  req: NextRequest;
  body: TBody;
  params: TParams;
  user: JWTPayload | undefined;
}

/**
 * Route handler configuration
 */
export interface RouteHandlerOptions<TBody = undefined, TParams = undefined> {
  /**
   * Zod schema for request body validation
   * If provided, body will be validated and passed to handler
   */
  bodySchema?: z.ZodSchema<TBody>;

  /**
   * Zod schema for route params validation
   * If provided, params will be validated and passed to handler
   */
  paramsSchema?: z.ZodSchema<TParams>;

  /**
   * Whether route requires authentication (default: true)
   * If true, Authorization header is required and JWT is verified
   */
  requiresAuth?: boolean;

  /**
   * Required permissions for RBAC check
   * Only checked if requiresAuth is true and user is authenticated
   */
  requiredPermissions?: string[];

  /**
   * Route handler implementation
   * Receives validated context and returns NextResponse
   */
  handler: (context: RouteHandlerContext<TBody, TParams>) => Promise<NextResponse>;
}

/**
 * Create composable route handler with auth, RBAC, validation, and error handling
 *
 * Execution order:
 * 1. Try/catch wrapper
 * 2. Authentication (if requiresAuth=true)
 * 3. RBAC permission check (if requiredPermissions provided)
 * 4. Body validation (if bodySchema provided)
 * 5. Params validation (if paramsSchema provided)
 * 6. Execute handler
 * 7. Return response or catch errors via handleRouteError
 *
 * @example
 * ```ts
 * export const POST = createRouteHandler({
 *   bodySchema: createBookingSchema,
 *   requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
 *   handler: async ({ req, body, user }) => {
 *     // Handler implementation
 *     return successResponse({ id: '...' });
 *   }
 * });
 * ```
 */
export function createRouteHandler<TBody = undefined, TParams = undefined>(
  options: RouteHandlerOptions<TBody, TParams>,
) {
  const {
    bodySchema,
    paramsSchema,
    requiresAuth = true,
    requiredPermissions = [],
    handler,
  } = options;

  return async (
    req: NextRequest,
    context?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      let user: JWTPayload | undefined;
      let body: TBody | undefined;
      let params: TParams | undefined;

      // 1. Authentication
      if (requiresAuth) {
        user = await authenticateRequest(req);

        // 2. RBAC permission check
        if (requiredPermissions.length > 0 && user) {
          checkPermissions(user, requiredPermissions);
        }
      }

      // 3. Body validation
      if (bodySchema) {
        body = await validateBody(bodySchema, req);
      }

      // 4. Params validation (Next.js 14 App Router: params is a Promise)
      if (paramsSchema && context?.params) {
        const resolvedParams = await context.params;
        params = validateParams(paramsSchema, resolvedParams);
      }

      // 5. Execute handler
      return await handler({
        req,
        body: body as TBody,
        params: params as TParams,
        user,
      });
    } catch (error) {
      // 6. Centralized error handling
      return handleRouteError(error);
    }
  };
}
