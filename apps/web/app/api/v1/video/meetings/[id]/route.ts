/**
 * Video Meeting Detail and Delete Endpoints
 * GET    /api/v1/video/meetings/[id] - Get video meeting detail
 * DELETE /api/v1/video/meetings/[id] - Cancel video meeting
 */

import { eq, and } from 'drizzle-orm';
import { db, videoMeetings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';
import { createVideoProvider } from '@schedulebox/shared/video-providers';

/**
 * Route params schema
 */
const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/video/meetings/[id]
 * Get video meeting detail by UUID
 */
export const GET = createRouteHandler({
  paramsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { id } = params as z.infer<typeof paramsSchema>;

    // Query video meeting by UUID
    const [meeting] = await db
      .select({
        uuid: videoMeetings.uuid,
        meetingUrl: videoMeetings.meetingUrl,
        hostUrl: videoMeetings.hostUrl,
        password: videoMeetings.password,
        provider: videoMeetings.provider,
        status: videoMeetings.status,
        startTime: videoMeetings.startTime,
        durationMinutes: videoMeetings.durationMinutes,
        createdAt: videoMeetings.createdAt,
        updatedAt: videoMeetings.updatedAt,
      })
      .from(videoMeetings)
      .where(and(eq(videoMeetings.uuid, id), eq(videoMeetings.companyId, companyId)))
      .limit(1);

    if (!meeting) {
      throw new NotFoundError('Video meeting not found');
    }

    return successResponse({
      id: meeting.uuid,
      meeting_url: meeting.meetingUrl,
      host_url: meeting.hostUrl,
      password: meeting.password,
      provider: meeting.provider,
      status: meeting.status,
      start_time: meeting.startTime,
      duration_minutes: meeting.durationMinutes,
      created_at: meeting.createdAt,
      updated_at: meeting.updatedAt,
    });
  },
});

/**
 * DELETE /api/v1/video/meetings/[id]
 * Cancel video meeting (via provider API and update local status)
 */
export const DELETE = createRouteHandler({
  paramsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { id } = params as z.infer<typeof paramsSchema>;

    // Find meeting by UUID
    const [meeting] = await db
      .select({
        id: videoMeetings.id,
        provider: videoMeetings.provider,
        meetingId: videoMeetings.meetingId,
        status: videoMeetings.status,
      })
      .from(videoMeetings)
      .where(and(eq(videoMeetings.uuid, id), eq(videoMeetings.companyId, companyId)))
      .limit(1);

    if (!meeting) {
      throw new NotFoundError('Video meeting not found');
    }

    // Try to delete via provider API (best effort - graceful degradation)
    if (meeting.meetingId && meeting.status !== 'cancelled') {
      try {
        const videoProvider = createVideoProvider(
          meeting.provider as 'zoom' | 'google_meet' | 'ms_teams',
        );
        await videoProvider.deleteMeeting(meeting.meetingId);
      } catch (error) {
        // Log error but don't fail the request
        console.error('[Video Meeting Delete] Provider deletion failed:', error);
        // Continue to update local status even if provider deletion fails
      }
    }

    // Update local status to cancelled
    await db
      .update(videoMeetings)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(videoMeetings.id, meeting.id));

    return noContentResponse();
  },
});
