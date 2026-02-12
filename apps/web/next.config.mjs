import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@schedulebox/ui',
    '@schedulebox/shared',
    '@schedulebox/events',
    '@schedulebox/database',
  ],
  serverExternalPackages: ['pdfkit', '@react-pdf/renderer'],
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
  experimental: {
    // Enable server actions for future phases
  },
};

export default withNextIntl(nextConfig);
