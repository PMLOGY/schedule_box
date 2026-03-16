/**
 * Company settings endpoints
 * GET /api/v1/settings/company - Get company profile
 * PUT /api/v1/settings/company - Update company settings
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { successResponse } from '@/lib/utils/response';
import { companyUpdateSchema } from '@/validations/settings';
import { db, companies } from '@schedulebox/database';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@schedulebox/shared';
import { sanitizeRichText } from '@/lib/security/sanitize';

/**
 * GET /api/v1/settings/company
 * Get company profile for authenticated user's company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Query company
    const [company] = await db
      .select({
        uuid: companies.uuid,
        name: companies.name,
        slug: companies.slug,
        email: companies.email,
        phone: companies.phone,
        website: companies.website,
        logo_url: companies.logoUrl,
        description: companies.description,
        address_street: companies.addressStreet,
        address_city: companies.addressCity,
        address_zip: companies.addressZip,
        currency: companies.currency,
        timezone: companies.timezone,
        subscription_plan: companies.subscriptionPlan,
        busy_appearance_enabled: companies.busyAppearanceEnabled,
        busy_appearance_percent: companies.busyAppearancePercent,
        onboarding_completed: companies.onboardingCompleted,
        industry_type: companies.industryType,
        settings: companies.settings,
        created_at: companies.createdAt,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return successResponse(company);
  },
});

/**
 * PUT /api/v1/settings/company
 * Update company settings (partial update)
 */
export const PUT = createRouteHandler({
  bodySchema: companyUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Build update object - map snake_case body to camelCase columns
    const updateData: Record<string, unknown> = {};
    if (body!.name !== undefined) updateData.name = body!.name;
    if (body!.email !== undefined) updateData.email = body!.email;
    if (body!.phone !== undefined) updateData.phone = body!.phone;
    if (body!.website !== undefined) updateData.website = body!.website;
    if (body!.logo_url !== undefined) updateData.logoUrl = body!.logo_url;
    if (body!.description !== undefined)
      updateData.description = sanitizeRichText(body!.description);
    if (body!.address_street !== undefined) updateData.addressStreet = body!.address_street;
    if (body!.address_city !== undefined) updateData.addressCity = body!.address_city;
    if (body!.address_zip !== undefined) updateData.addressZip = body!.address_zip;
    if (body!.currency !== undefined) updateData.currency = body!.currency;
    if (body!.timezone !== undefined) updateData.timezone = body!.timezone;
    if (body!.busy_appearance_enabled !== undefined)
      updateData.busyAppearanceEnabled = body!.busy_appearance_enabled;
    if (body!.busy_appearance_percent !== undefined)
      updateData.busyAppearancePercent = body!.busy_appearance_percent;
    if (body!.onboarding_completed !== undefined)
      updateData.onboardingCompleted = body!.onboarding_completed;
    if (body!.industry_type !== undefined) updateData.industryType = body!.industry_type;

    // Update company
    const [updatedCompany] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning({
        uuid: companies.uuid,
        name: companies.name,
        slug: companies.slug,
        email: companies.email,
        phone: companies.phone,
        website: companies.website,
        logo_url: companies.logoUrl,
        description: companies.description,
        address_street: companies.addressStreet,
        address_city: companies.addressCity,
        address_zip: companies.addressZip,
        currency: companies.currency,
        timezone: companies.timezone,
        subscription_plan: companies.subscriptionPlan,
        busy_appearance_enabled: companies.busyAppearanceEnabled,
        busy_appearance_percent: companies.busyAppearancePercent,
        onboarding_completed: companies.onboardingCompleted,
        industry_type: companies.industryType,
        settings: companies.settings,
        created_at: companies.createdAt,
      });

    if (!updatedCompany) {
      throw new NotFoundError('Company not found');
    }

    return successResponse({ data: updatedCompany });
  },
});
