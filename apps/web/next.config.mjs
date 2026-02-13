import createNextIntlPlugin from 'next-intl/plugin';
import {
  securityHeaders,
  embedSecurityHeaders,
} from '../../security/headers/security-headers.mjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    'ioredis',
    'jsonwebtoken',
    'otplib',
    'opossum',
    'handlebars',
    'google-auth-library',
    'passkit-generator',
    'drizzle-orm',
    '@schedulebox/database',
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

export default withNextIntl(nextConfig);
