import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  devIndicators: false,
  agentRules: false,
  images: { unoptimized: true },
};

export default config;
