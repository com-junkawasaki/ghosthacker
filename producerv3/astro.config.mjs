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
import clerk from '@clerk/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    clerk({
      afterSignInUrl: '/projects',
      afterSignUpUrl: '/projects',
    }),
  ],
  output: 'server',
  adapter: undefined, // Add adapter for production deployment
});
