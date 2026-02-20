/**
 * AI No-Show Prediction Client for Notification Worker
 * Lightweight HTTP call to AI service -- no circuit breaker needed
 * (reminder scanner runs every 15 min, low frequency)
 */

import { config } from '../config.js';

export interface NoShowPredictionResult {
  no_show_probability: number;
  risk_level: string;
  fallback: boolean;
}

/**
 * Get no-show prediction for a booking from the AI service.
 * Returns conservative fallback (low probability, fallback=true) on any error.
 */
export async function getNoShowPrediction(bookingId: number): Promise<NoShowPredictionResult> {
  const FALLBACK: NoShowPredictionResult = {
    no_show_probability: 0.15,
    risk_level: 'low',
    fallback: true,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${config.ai.serviceUrl}/api/v1/predictions/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(
        `[No-Show Client] AI service returned ${response.status} for booking ${bookingId}`,
      );
      return FALLBACK;
    }

    const data = await response.json();
    return {
      no_show_probability: data.no_show_probability ?? 0.15,
      risk_level: data.risk_level ?? 'low',
      fallback: data.fallback ?? false,
    };
  } catch (error) {
    console.warn(
      `[No-Show Client] AI service unavailable for booking ${bookingId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return FALLBACK;
  }
}
