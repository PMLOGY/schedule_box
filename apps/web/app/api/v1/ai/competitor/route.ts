/**
 * Competitor Intelligence Endpoints
 * GET /api/v1/ai/competitor -- Retrieve stored competitor data
 * POST /api/v1/ai/competitor -- Trigger competitor scraping
 *
 * GET queries the competitor_data table directly (Drizzle ORM).
 * POST triggers the Python AI service to scrape a competitor website.
 * Uses circuit breaker: returns empty data when AI service unavailable.
 */

import { and, eq, desc } from 'drizzle-orm';
import { db, competitorData } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { triggerCompetitorScrape } from '@/lib/ai/client';
import { getCompetitorScrapeFallback } from '@/lib/ai/fallback';
import { competitorScrapeRequestSchema, competitorQuerySchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/competitor
 * Trigger competitor data scraping via the Python AI service.
 * On success, stores scraped results in the competitor_data table.
 * Permission: settings.manage (admin-only feature).
 * Returns 200 with fallback on AI service failure.
 */
export const POST = createRouteHandler({
  bodySchema: competitorScrapeRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    try {
      const request = {
        ...body,
        company_id: companyId,
      };
      const result = await triggerCompetitorScrape.fire(request);

      // If scraping succeeded, store results in competitor_data table
      if (result.results.length > 0 && companyId) {
        for (const item of result.results) {
          await db.insert(competitorData).values({
            companyId: companyId,
            competitorName: item.competitor_name,
            competitorUrl: body.competitor_url,
            dataType: item.data_type,
            data: item.data,
          });
        }
      }

      return successResponse(result);
    } catch {
      const fallback = getCompetitorScrapeFallback({
        ...body,
        company_id: companyId ?? 0,
      });
      return successResponse(fallback);
    }
  },
});

/**
 * GET /api/v1/ai/competitor
 * Retrieve previously scraped competitor data from the database.
 * Supports filtering by competitor_name and data_type.
 * Permission: settings.manage (admin-only feature).
 * Returns results ordered by most recent scrape date.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(competitorQuerySchema, req);

    // Build query conditions with tenant isolation
    const conditions = [eq(competitorData.companyId, companyId)];

    if (query.competitor_name) {
      conditions.push(eq(competitorData.competitorName, query.competitor_name));
    }
    if (query.data_type) {
      conditions.push(eq(competitorData.dataType, query.data_type));
    }

    const results = await db
      .select()
      .from(competitorData)
      .where(and(...conditions))
      .orderBy(desc(competitorData.scrapedAt))
      .limit(100);

    return successResponse({
      data: results,
      total: results.length,
    });
  },
});
