import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@joju/types', '@joju/utils'],
};

export default nextConfig;
