import type { z } from 'zod';
import type {
  voiceBookingSchema,
  followUpRequestSchema,
  competitorScrapeRequestSchema,
  competitorQuerySchema,
} from '../schemas/ai-voice-intelligence';

export type VoiceBookingInput = z.infer<typeof voiceBookingSchema>;
export type FollowUpRequestInput = z.infer<typeof followUpRequestSchema>;
export type CompetitorScrapeInput = z.infer<typeof competitorScrapeRequestSchema>;
export type CompetitorQueryInput = z.infer<typeof competitorQuerySchema>;
