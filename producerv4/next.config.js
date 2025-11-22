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
    
    // Ignore canvas and konva modules on server-side (Konva requires canvas only on client-side)
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      };
      
      // Ignore konva imports on server-side using externals
      const originalExternals = config.externals || [];
      const externalsFunction = ({ request }, callback) => {
        // Ignore konva and canvas modules on server-side
        if (request === 'konva' || request === 'react-konva' || request === 'canvas') {
          return callback(null, `commonjs ${request}`);
        }
        if (typeof originalExternals === 'function') {
          return originalExternals({ request }, callback);
        }
        callback();
      };
      
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        externalsFunction,
      ];
      
      // Also add to resolve.alias to prevent module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        'konva': false,
        'react-konva': false,
        'canvas': false,
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

