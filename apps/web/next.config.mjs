/* global process */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import {
  securityHeaders,
  embedSecurityHeaders,
} from '../../security/headers/security-headers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove X-Powered-By header to reduce server fingerprinting
  poweredByHeader: false,
  // Standalone output for Docker/Coolify — disabled on Windows dev (symlink permission issues)
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && {
    output: 'standalone',
    // Monorepo root must be explicit so standalone traces files from packages/* and security/*
    outputFileTracingRoot: resolve(__dirname, '../../'),
  }),
  // Include files that dynamic imports or runtime reads need in standalone output
  outputFileTracingIncludes: {
    '/*': ['./messages/**/*', '../../security/**/*'],
  },
  // Exclude heavy directories from build traces to prevent Docker build timeout
  outputFileTracingExcludes: {
    '/*': [
      '.git/**',
      'e2e/**',
      'playwright-report/**',
      '**/*.stories.tsx',
      '**/*.spec.ts',
      '**/*.test.ts',
      'services/**',
      '.planning/**',
      'docs/**',
    ],
  },
  // Skip lint & typecheck in Docker builds — CI handles these; saves ~500MB RAM during build
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
    'ioredis',
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

// Only enable Sentry wrapping if DSN is configured; otherwise skip entirely
// to avoid tunnel route errors and unnecessary overhead on Coolify
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default hasSentry
  ? withSentryConfig(withNextIntl(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      silent: !process.env.SENTRY_AUTH_TOKEN,
      autoInstrumentServerFunctions: false,
      autoInstrumentMiddleware: false,
      autoInstrumentAppDirectory: false,
    })
  : withNextIntl(nextConfig);
