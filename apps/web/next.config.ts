import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@joju/types', '@joju/utils'],
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
