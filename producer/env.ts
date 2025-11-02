import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    DATABASE_URL: z.string().url(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
