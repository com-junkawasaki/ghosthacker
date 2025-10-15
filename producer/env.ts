import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NEO4J_URI: z.string().url(),
    NEO4J_USER: z.string(),
    NEO4J_PASSWORD: z.string(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
