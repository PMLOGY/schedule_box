/**
 * Notification Template Detail Endpoints
 * GET    /api/v1/notification-templates/:id - Get single template
 * PUT    /api/v1/notification-templates/:id - Update template
 * DELETE /api/v1/notification-templates/:id - Delete template
 */

import { eq, and } from 'drizzle-orm';
import { db, notificationTemplates } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { notificationTemplateUpdateSchema } from '@schedulebox/shared';
import { z } from 'zod';

/**
 * Params schema for template ID
 * Note: Route params come as strings, we parse to number in handler
 */
const templateParamsSchema = z.object({
  id: z.string(),
});

type TemplateParams = { id: string };

/**
 * GET /api/v1/notification-templates/:id
 * Get single notification template by ID
 */
export const GET = createRouteHandler({
  paramsSchema: templateParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id: idStr } = params as TemplateParams;

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid template ID', 400);
    }

    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.companyId, companyId)))
      .limit(1);

    if (!template) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Template not found', 404);
    }

    return successResponse(template);
  },
});

/**
 * PUT /api/v1/notification-templates/:id
 * Update notification template
 *
 * Returns:
 * - 200: Template updated successfully
 * - 404: Template not found
 * - 409: Duplicate constraint violation
 * - 400: Validation error
 */
export const PUT = createRouteHandler({
  paramsSchema: templateParamsSchema,
  bodySchema: notificationTemplateUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id: idStr } = params as TemplateParams;

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid template ID', 400);
    }

    // Check if template exists and belongs to company
    const [existingTemplate] = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.companyId, companyId)))
      .limit(1);

    if (!existingTemplate) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Template not found', 404);
    }

    try {
      // Update template
      const [updatedTemplate] = await db
        .update(notificationTemplates)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(
          and(eq(notificationTemplates.id, id), eq(notificationTemplates.companyId, companyId)),
        )
        .returning();

      return successResponse(updatedTemplate);
    } catch (error: unknown) {
      // Handle unique constraint violation
      const dbError = error as { code?: string; constraint?: string };
      if (dbError.code === '23505' && dbError.constraint?.includes('company_type_channel')) {
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

/**
 * DELETE /api/v1/notification-templates/:id
 * Delete notification template
 *
 * Returns:
 * - 204: Template deleted successfully
 * - 404: Template not found
 */
export const DELETE = createRouteHandler({
  paramsSchema: templateParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id: idStr } = params as TemplateParams;

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid template ID', 400);
    }

    // Delete template (only if belongs to company)
    const result = await db
      .delete(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.companyId, companyId)))
      .returning();

    if (result.length === 0) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Template not found', 404);
    }

    return noContentResponse();
  },
});
