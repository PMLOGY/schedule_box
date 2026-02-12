/**
 * AI Voice Booking Processing Endpoint
 * POST /api/v1/bookings/voice
 *
 * Accepts audio file upload, transcribes via Whisper, extracts booking intent via GPT-4.
 * Returns transcript + intent + entities for frontend confirmation.
 * Does NOT create bookings -- frontend handles actual booking via existing POST /bookings.
 * Uses circuit breaker: returns fallback (unknown intent) when AI unavailable.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { processVoice } from '@/lib/ai/client';
import { getVoiceProcessFallback } from '@/lib/ai/fallback';
import { BadRequestError } from '@schedulebox/shared';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_LANGUAGES = ['cs', 'sk', 'en'] as const;

/**
 * POST /api/v1/bookings/voice
 * Process voice audio for booking intent extraction.
 * Permission: bookings.read (accessible during booking flow, same as upselling).
 * Returns 200 with fallback on AI failure (non-critical, advisory).
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Resolve company ID from authenticated user
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse multipart form data (audio comes as FormData, not JSON)
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'cs';

    // Validate audio file exists
    if (!audioFile || !(audioFile instanceof File)) {
      throw new BadRequestError('Audio file is required');
    }

    // Validate audio file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      throw new BadRequestError(
        `Audio file too large: ${audioFile.size} bytes (max ${MAX_AUDIO_SIZE} bytes)`,
      );
    }

    // Validate language
    if (!ALLOWED_LANGUAGES.includes(language as (typeof ALLOWED_LANGUAGES)[number])) {
      throw new BadRequestError(
        `Invalid language: ${language}. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`,
      );
    }

    // Build proxy FormData for AI service
    const proxyFormData = new FormData();
    proxyFormData.append('audio', audioFile);
    proxyFormData.append('language', language);
    proxyFormData.append('company_id', String(companyId));

    // Call AI service via circuit breaker (15s timeout)
    try {
      const result = await processVoice.fire(proxyFormData);
      return successResponse(result);
    } catch {
      // AI service unavailable -- return graceful fallback
      const fallback = getVoiceProcessFallback();
      return successResponse(fallback);
    }
  },
});
