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

