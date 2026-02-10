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

export default nextConfig;
