'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error with digest for Coolify logs
    console.error('[global-error]', error.message, error.digest, error.stack);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h2>Something went wrong</h2>
          <p>Error: {error.message || 'Unknown error'}</p>
          {error.digest && <p>Digest: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
