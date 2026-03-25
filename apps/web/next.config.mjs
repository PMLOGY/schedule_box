/* eslint-env node */
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import {
  securityHeaders,
  embedSecurityHeaders,
} from '../../security/headers/security-headers.mjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker/Coolify — disabled on Windows dev (symlink permission issues)
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && { output: 'standalone' }),
  transpilePackages: [
    '@schedulebox/ui',
    '@schedulebox/shared',
    '@schedulebox/events',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  serverExternalPackages: [
    'pdfkit',
    '@react-pdf/renderer',
    'argon2',
    'jsonwebtoken',
    'otplib',
    'opossum',
    'handlebars',
    'google-auth-library',
    'passkit-generator',
    'drizzle-orm',
    '@schedulebox/database',
    '@neondatabase/serverless',
    '@opentelemetry/sdk-node',
    '@opentelemetry/api',
    '@opentelemetry/instrumentation',
    'require-in-the-middle',
    // isomorphic-dompurify uses jsdom which has native CSS file reads via fs.readFileSync
    // Must be external to prevent webpack from bundling it with incorrect __dirname resolution
    'isomorphic-dompurify',
    'jsdom',
  ],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Relaxed CSP for embed widget routes (must be embeddable from any domain)
        source: '/embed/:path*',
        headers: embedSecurityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: false,
});
