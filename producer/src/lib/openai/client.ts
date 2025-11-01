import OpenAI from 'openai';
import { env } from '@/env';

let client: OpenAI | null = null;

/**
 * Get OpenAI client instance (singleton pattern)
 */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return client;
}

