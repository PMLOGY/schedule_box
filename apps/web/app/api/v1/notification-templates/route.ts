/**
 * Notification Templates List and Create Endpoints
 * GET  /api/v1/notification-templates - List templates with optional filters
 * POST /api/v1/notification-templates - Create new template
 */

import { eq, and, count } from 'drizzle-orm';
import { db, notificationTemplates } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, paginatedResponse } from '@/lib/utils/response';
import { notificationTemplateCreateSchema } from '@schedulebox/shared';
import { z } from 'zod';
import { sanitizeRichText } from '@/lib/security/sanitize';

/**
 * Query schema for listing templates
 */
const templateListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  channel: z.enum(['email', 'sms', 'push']).optional(),
});

type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

/**
 * GET /api/v1/notification-templates
 * List notification templates with optional type and channel filters
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const query = validateQuery(templateListQuerySchema, req) as TemplateListQuery;

    // Build where conditions
    const conditions = [eq(notificationTemplates.companyId, companyId)];

    if (query.type) {
      conditions.push(eq(notificationTemplates.type, query.type));
    }

    if (query.channel) {
      conditions.push(eq(notificationTemplates.channel, query.channel));
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Query templates
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(notificationTemplates)
        .where(and(...conditions))
        .limit(query.limit)
        .offset(offset)
        .orderBy(notificationTemplates.createdAt),
      db
        .select({ count: count() })
        .from(notificationTemplates)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / query.limit);

    return paginatedResponse(data, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: totalPages,
    });
  },
});

/**
 * POST /api/v1/notification-templates
 * Create new notification template
 *
 * Returns:
 * - 201: Template created successfully
 * - 409: Duplicate template (company_id, type, channel constraint)
 * - 400: Validation error
 */
export const POST = createRouteHandler({
  bodySchema: notificationTemplateCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    try {
      // Sanitize rich text body template before DB insert (SEC-02)
      const cleanBody = body.bodyTemplate ? sanitizeRichText(body.bodyTemplate) : body.bodyTemplate;

      // Insert template
      const [template] = await db
        .insert(notificationTemplates)
        .values({
          companyId,
          type: body.type,
          channel: body.channel,
          subject: body.subject,
          bodyTemplate: cleanBody,
          isActive: body.isActive ?? true,
        })
        .returning();

      return successResponse(template, 201);
    } catch (error) {
      // Handle unique constraint violation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505' &&
        'constraint_name' in error &&
        typeof error.constraint_name === 'string' &&
        error.constraint_name.includes('company_type_channel')
      ) {
        throw new AppError(
          'DUPLICATE_RESOURCE',
          'A template with this type and channel already exists',
          409,
        );
      }
      throw error;
    }
  },
});
