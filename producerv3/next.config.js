/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/actor/editor
 * 
 * Next.js configuration for EPUB Editor Frontend
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14 uses App Router by default
  experimental: {
    // No special experimental features needed for Next.js 14
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_GRAPHQL_API_URL: process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:25325/graphql',
  },
  // Webpack configuration if needed
  webpack: (config, { isServer }) => {
    // Optimize dependencies
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;

