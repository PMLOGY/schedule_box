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
  experimental: {
    // Enable server actions for future phases
  },
};

export default withNextIntl(nextConfig);
