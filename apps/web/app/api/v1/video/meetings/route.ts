/**
 * Video Meeting Create Endpoint
 * POST /api/v1/video/meetings - Create video meeting for booking
 */

import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, videoMeetings, bookings, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse } from '@/lib/utils/response';
import {
  videoMeetingCreateSchema,
  type VideoMeetingCreate,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@schedulebox/shared';
import {
  createVideoProvider,
  VideoProviderError,
  type VideoProviderType,
} from '@schedulebox/shared/video-providers';

/**
 * POST /api/v1/video/meetings
 * Create video meeting for a booking via provider API
 */
export const POST = createRouteHandler({
  bodySchema: videoMeetingCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { bookingUuid, provider } = body as VideoMeetingCreate;

    // Find booking by UUID and verify it belongs to company
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        companyId: bookings.companyId,
        customerId: bookings.customerId,
        serviceId: bookings.serviceId,
        status: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(eq(bookings.uuid, bookingUuid))
      .limit(1);

    // Validate booking exists and belongs to company
    if (!booking || booking.companyId !== companyId) {
      throw new NotFoundError('Booking not found');
    }

    // Validate booking status allows video meeting
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new ValidationError(
        'Cannot create video meeting for cancelled, completed, or no-show booking',
      );
    }

    // Check if video meeting already exists for this booking
    const [existingMeeting] = await db
      .select({ id: videoMeetings.id })
      .from(videoMeetings)
      .where(and(eq(videoMeetings.bookingId, booking.id), eq(videoMeetings.companyId, companyId)))
      .limit(1);

    if (existingMeeting) {
      throw new ConflictError('Video meeting already exists for this booking');
    }

    // Calculate duration in minutes
    const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    // Create video provider instance and meeting
    let meetingResult;
    try {
      const videoProvider = createVideoProvider(provider as VideoProviderType);

      // Fetch service name for meeting topic
      const [service] = await db
        .select({ name: services.name })
        .from(services)
        .where(eq(services.id, booking.serviceId))
        .limit(1);

      const topic = service?.name ?? 'Booking';

      meetingResult = await videoProvider.createMeeting({
        topic,
        startTime: booking.startTime,
        durationMinutes,
        hostEmail: 'noreply@schedulebox.cz', // TODO: Use employee email when available
      });
    } catch (error: unknown) {
      if (error instanceof VideoProviderError) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
          return NextResponse.json(
            {
              error: {
                code: 'PROVIDER_NOT_CONFIGURED',
                message: `Video provider ${provider} not configured`,
              },
            },
            { status: 503 },
          );
        }
        // Other provider errors
        return NextResponse.json(
          {
            error: {
              code: 'PROVIDER_ERROR',
              message: 'Failed to create video meeting',
              details: error.message,
            },
          },
          { status: 502 },
        );
      }
      throw error; // Re-throw non-VideoProviderError errors
    }

    // Insert video meeting record into database
    const [newMeeting] = await db
      .insert(videoMeetings)
      .values({
        companyId,
        bookingId: booking.id,
        provider,
        meetingUrl: meetingResult.meetingUrl,
        hostUrl: meetingResult.hostUrl,
        meetingId: meetingResult.meetingId,
        password: meetingResult.password,
        startTime: booking.startTime,
        durationMinutes,
        status: 'scheduled',
        providerResponse: meetingResult.providerResponse,
      })
      .returning({
        uuid: videoMeetings.uuid,
        meetingUrl: videoMeetings.meetingUrl,
        hostUrl: videoMeetings.hostUrl,
        password: videoMeetings.password,
        provider: videoMeetings.provider,
        status: videoMeetings.status,
        startTime: videoMeetings.startTime,
        durationMinutes: videoMeetings.durationMinutes,
        createdAt: videoMeetings.createdAt,
      });

    // Return created meeting (use UUID, not SERIAL id)
    return createdResponse({
      id: newMeeting.uuid,
      booking_id: booking.uuid,
      meeting_url: newMeeting.meetingUrl,
      host_url: newMeeting.hostUrl,
      password: newMeeting.password,
      provider: newMeeting.provider,
      status: newMeeting.status,
      start_time: newMeeting.startTime,
      duration_minutes: newMeeting.durationMinutes,
      created_at: newMeeting.createdAt,
    });
  },
});
