/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@casdex/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://casdex-test-production.up.railway.app/api',
  },
};

module.exports = nextConfig;
