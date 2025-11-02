/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:DrizzleConfig}
 * Merkle DAG: drizzle-config -> drizzle-kit -> env
 * Drizzle Kit configuration for database migrations
 */
import { defineConfig } from 'drizzle-kit';
import { env } from './env';

export default defineConfig({
  schema: './src/infra/supabase/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});

