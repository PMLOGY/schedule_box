/**
 * POST /api/v1/onboarding/apply-template
 *
 * Apply an industry template: creates all services and replaces company-level
 * working hours in a single transaction, then updates the company industryType.
 *
 * Reduces wizard setup time from ~5 minutes to under 2 minutes for the 8 most
 * common Czech business types.
 */

import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, services, workingHours, companies } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { BadRequestError } from '@schedulebox/shared';
import { getTemplateByIndustry } from '@/lib/onboarding/industry-templates';

const applyTemplateSchema = z.object({
  industry_type: z.string().min(1),
});

export const POST = createRouteHandler({
  bodySchema: applyTemplateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_CREATE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Resolve company scope
    const { companyId } = await findCompanyId(user.sub);

    // Look up template
    const template = getTemplateByIndustry(body.industry_type);
    if (!template) {
      throw new BadRequestError(`Industry template not found: ${body.industry_type}`);
    }

    // Apply template in a transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create all services from the template
      let servicesCreated = 0;
      for (const svc of template.services) {
        await tx.insert(services).values({
          companyId,
          name: svc.name,
          description: svc.description,
          durationMinutes: svc.durationMinutes,
          bufferAfterMinutes: svc.bufferAfterMinutes,
          price: svc.price.toString(),
          maxCapacity: svc.maxCapacity,
          onlineBookingEnabled: true,
          color: svc.color,
          isOnline: svc.isOnline ?? false,
        });
        servicesCreated++;
      }

      // 2. Replace company-level working hours (delete existing, insert new)
      await tx
        .delete(workingHours)
        .where(and(eq(workingHours.companyId, companyId), isNull(workingHours.employeeId)));

      let workingHoursSet = 0;
      for (const wh of template.workingHours) {
        if (wh.isActive) {
          await tx.insert(workingHours).values({
            companyId,
            employeeId: null,
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            isActive: true,
          });
          workingHoursSet++;
        }
      }

      // 3. Update company industry_type
      await tx
        .update(companies)
        .set({ industryType: body.industry_type })
        .where(eq(companies.id, companyId));

      return { servicesCreated, workingHoursSet };
    });

    return successResponse({
      services_created: result.servicesCreated,
      working_hours_set: result.workingHoursSet,
      industry_type: body.industry_type,
    });
  },
});
