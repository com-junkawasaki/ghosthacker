/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:DrizzleConfig}
 * Merkle DAG: drizzle-config -> drizzle-kit -> env
 * Drizzle Kit configuration for database migrations
 */
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

export default defineConfig({
  schema: './src/infra/supabase/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

