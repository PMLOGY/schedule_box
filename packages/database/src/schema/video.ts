/**
 * Video Schema
 *
 * Video conferencing integration for virtual bookings:
 * - video_meetings: Meeting links and metadata for Zoom/Google Meet/MS Teams
 */

import {
  pgTable,
  serial,
  uuid,
  integer,
  varchar,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

// ============================================================================
// VIDEO_MEETINGS TABLE
// ============================================================================

export const videoMeetings = pgTable(
  'video_meetings',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    bookingId: integer('booking_id').notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    meetingUrl: varchar('meeting_url', { length: 500 }).notNull(),
    meetingId: varchar('meeting_id', { length: 255 }),
    hostUrl: varchar('host_url', { length: 500 }),
    password: varchar('password', { length: 50 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    status: varchar('status', { length: 20 }).default('scheduled'),
    providerResponse: jsonb('provider_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    providerCheck: check(
      'video_meeting_provider_check',
      sql`${table.provider} IN ('zoom', 'google_meet', 'ms_teams')`,
    ),
    statusCheck: check(
      'video_meeting_status_check',
      sql`${table.status} IN ('scheduled', 'started', 'ended', 'cancelled')`,
    ),
    companyIdx: index('idx_video_meetings_company').on(table.companyId),
    bookingIdx: index('idx_video_meetings_booking').on(table.bookingId),
  }),
);
