import { OpenAI } from 'openai';
import { env } from '@/env.mjs';
import * as v from 'valibot';

// Initialize OpenRouter client (uses OpenAI SDK)
const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Structured output schemas using Valibot
export const WriterOutputSchema = v.object({
  title: v.string(),
  content: v.string(),
  metadata: v.object({
    wordCount: v.number(),
    estimatedReadingTime: v.number(),
  }),
});

export const ImageGenOutputSchema = v.object({
  prompt: v.string(),
  style: v.string(),
  description: v.string(),
});

export const VideoScriptOutputSchema = v.object({
  scenes: v.array(v.object({
    description: v.string(),
    duration: v.number(),
    visuals: v.array(v.string()),
    narration: v.string(),
  })),
  totalDuration: v.number(),
});

export type WriterOutput = v.InferOutput<typeof WriterOutputSchema>;
export type ImageGenOutput = v.InferOutput<typeof ImageGenOutputSchema>;
export type VideoScriptOutput = v.InferOutput<typeof VideoScriptOutputSchema>;

// Model routing based on task type
export function getModelForTask(taskType: string): string {
  switch (taskType) {
    case 'writer':
      return 'gpt-4o-mini';
    case 'image-gen':
      return 'flux-1.1-pro'; // or other image model via OpenRouter
    case 'video-script':
      return 'gpt-4o';
    case 'tts':
      return 'openai/tts-1'; // if available via OpenRouter
    default:
      return 'gpt-4o-mini';
  }
}

export async function callOpenRouter<T>(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  taskType: string,
  schema?: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
): Promise<T> {
  const model = getModelForTask(taskType);

  const response = await openrouter.chat.completions.create({
    model,
    messages,
    max_tokens: 4000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenRouter');
  }

  // Parse JSON response
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse OpenRouter response: ${content}`);
  }

  // Validate against schema if provided
  if (schema) {
    const result = v.safeParse(schema, parsed);
    if (!result.success) {
      throw new Error(`Schema validation failed: ${result.issues.map(i => i.message).join(', ')}`);
    }
    return result.output as T;
  }

  return parsed as T;
}

// Specialized functions for different tasks
export async function generateWriterOutput(
  prompt: string,
  context?: string
): Promise<WriterOutput> {
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    {
      role: 'system',
      content: 'You are a creative writer specializing in ghost stories and supernatural fiction. Generate engaging, atmospheric content with vivid descriptions and compelling narratives.',
    },
    {
      role: 'user',
      content: `${context ? `Context: ${context}\n\n` : ''}Prompt: ${prompt}\n\nGenerate a story segment in JSON format with title, content, and metadata.`,
    },
  ];

  return callOpenRouter<WriterOutput>(messages, 'writer', WriterOutputSchema);
}

export async function generateImagePrompt(
  sceneDescription: string,
  style?: string
): Promise<ImageGenOutput> {
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    {
      role: 'system',
      content: 'You are an expert at creating detailed, vivid image generation prompts for AI art tools. Include specific visual details, lighting, composition, and artistic style guidance.',
    },
    {
      role: 'user',
      content: `Scene: ${sceneDescription}${style ? `\nStyle: ${style}` : ''}\n\nGenerate an image prompt in JSON format.`,
    },
  ];

  return callOpenRouter<ImageGenOutput>(messages, 'image-gen', ImageGenOutputSchema);
}

export async function generateVideoScript(
  storyContent: string,
  characterDescriptions?: string
): Promise<VideoScriptOutput> {
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    {
      role: 'system',
      content: 'You are a video script writer specializing in atmospheric, cinematic storytelling. Break down stories into visual scenes with timing, descriptions, and narration.',
    },
    {
      role: 'user',
      content: `Story content: ${storyContent}${characterDescriptions ? `\nCharacters: ${characterDescriptions}` : ''}\n\nGenerate a video script with scenes, timing, and narration in JSON format.`,
    },
  ];

  return callOpenRouter<VideoScriptOutput>(messages, 'video-script', VideoScriptOutputSchema);
}
