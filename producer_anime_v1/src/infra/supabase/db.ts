/**
 * @context https://schema.org/DatabaseConnection
 * @type {gh:DatabaseConnection}
 * Merkle DAG: db-connection -> drizzle-orm -> postgres -> env
 * Drizzle database connection for Supabase PostgreSQL
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

const connectionString = env.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

