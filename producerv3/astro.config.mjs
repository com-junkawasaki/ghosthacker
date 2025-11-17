// @ts-check
/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/actor/editor
 * 
 * Astro configuration for EPUB Editor Frontend
 */
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
  ],
  output: 'server',
  // Adapter is only required for production builds
  // In development, Astro dev server handles SSR without adapter
  // adapter: undefined, // Will be set conditionally if available
  server: {
    host: true, // Listen on all addresses
    port: 3000,
  },
  vite: {
    server: {
      host: true, // Listen on all addresses for Docker
      strictPort: false,
      fs: {
        deny: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/test/**'],
      },
      hmr: {
        // HMR configuration for Docker environment
        // Use host network IP or container name for HMR connection
        host: process.env.VITE_HMR_HOST || 'localhost',
        port: process.env.VITE_HMR_PORT || 3000,
        protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
        clientPort: process.env.VITE_HMR_CLIENT_PORT || 25320, // Host port mapped to container port 3000
      },
      watch: {
        // Improve file watching reliability on macOS bind mounts
        usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
        interval: parseInt(process.env.WATCHPACK_POLLING_INTERVAL || '1000', 10),
      },
      allowedHosts: [
        'frontend.producerv3.orb.local',
        'localhost',
        '127.0.0.1',
        '.orb.local', // Allow all OrbStack local domains
      ],
    },
    resolve: {
      alias: {
        // Exclude test files from build
      },
    },
    build: {
      rollupOptions: {
        external: (id) => {
          // Exclude test files and test dependencies
          if (id.includes('__tests__') || id.includes('.test.') || id.includes('.spec.')) {
            return true;
          }
          if (id === 'vitest' || id === '@testing-library/react' || id === '@testing-library/jest-dom') {
            return true;
          }
          return false;
        },
      },
    },
    optimizeDeps: {
      include: ['@apollo/client', '@apollo/client/link/context'],
      esbuildOptions: {
        target: 'esnext',
      },
    },
    ssr: {
      noExternal: ['@apollo/client'],
    },
  },
});
