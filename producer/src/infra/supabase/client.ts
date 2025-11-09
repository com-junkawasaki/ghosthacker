/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:SupabaseClient}
 * Merkle DAG: supabase-client -> @supabase/supabase-js -> env
 * Supabase client initialization for storage operations
 */
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

