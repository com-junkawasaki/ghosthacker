import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().url(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    YOUTUBE_CLIENT_ID: z.string().optional(),
    YOUTUBE_CLIENT_SECRET: z.string().optional(),
    SORA_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
    SORA_API_KEY: process.env.SORA_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
