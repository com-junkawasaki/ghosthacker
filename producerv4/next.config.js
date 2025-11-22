/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/actor/manga-editor
 * 
 * Next.js configuration for Manga Editor Frontend
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Webpack configuration if needed
  webpack: (config, { isServer, dev }) => {
    // Optimize dependencies
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
        },
      };
    }
    
    // Improve HMR in Docker environment
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding once the first file changed
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

