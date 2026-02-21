import { type NextRequest, NextResponse } from 'next/server';

/**
 * Validate X-AI-Service-Key header for internal machine-to-machine routes.
 * Returns null if auth passes, or a 401 NextResponse if it fails.
 * In development mode (AI_SERVICE_API_KEY not set), auth is skipped.
 */
export function validateAiServiceKey(req: NextRequest): NextResponse | null {
  const apiKey = req.headers.get('x-ai-service-key');
  const expectedKey = process.env.AI_SERVICE_API_KEY;

  if (!expectedKey) {
    // Dev mode: skip auth if key not configured
    return null;
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized', code: 'INVALID_API_KEY' }, { status: 401 });
  }

  return null; // Auth passed
}
