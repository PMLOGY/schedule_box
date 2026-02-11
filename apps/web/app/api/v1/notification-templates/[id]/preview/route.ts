/**
 * Notification Template Preview Endpoint
 * POST /api/v1/notification-templates/:id/preview - Render template with test data
 */

import { eq, and } from 'drizzle-orm';
import { db, notificationTemplates } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';
import Handlebars from 'handlebars';

/**
 * Params schema for template ID
 * Note: Route params come as strings, we parse to number in handler
 */
const templateParamsSchema = z.object({
  id: z.string(),
});

type TemplateParams = { id: string };

/**
 * Body schema for preview request
 */
const previewBodySchema = z.object({
  testData: z.record(z.unknown()),
});

type PreviewBody = z.infer<typeof previewBodySchema>;

/**
 * POST /api/v1/notification-templates/:id/preview
 * Render template with provided test data
 *
 * Allows admins to preview how templates will render with sample data
 * before saving or activating them.
 *
 * Returns:
 * - 200: Rendered template (subject and body)
 * - 404: Template not found
 * - 400: Template rendering error
 */
export const POST = createRouteHandler({
  paramsSchema: templateParamsSchema,
  bodySchema: previewBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id: idStr } = params as TemplateParams;
    const { testData } = body as PreviewBody;

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid template ID', 400);
    }

    // Fetch template
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.companyId, companyId)))
      .limit(1);

    if (!template) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Template not found', 404);
    }

    try {
      // Compile and render subject (if exists)
      let renderedSubject: string | null = null;
      if (template.subject) {
        const subjectTemplate = Handlebars.compile(template.subject);
        renderedSubject = subjectTemplate(testData);
      }

      // Compile and render body
      const bodyTemplate = Handlebars.compile(template.bodyTemplate);
      const renderedBody = bodyTemplate(testData);

      return successResponse({
        subject: renderedSubject,
        body: renderedBody,
        channel: template.channel,
        type: template.type,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError('VALIDATION_ERROR', `Template rendering failed: ${message}`, 400);
    }
  },
});
