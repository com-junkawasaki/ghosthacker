import { z } from 'zod';

/**
 * Process content schema for MongoDB
 * Stores JSON-LD content for each process in a project
 */
export const ProcessContentSchema = z.object({
  _id: z.string().optional(),
  projectId: z.string(),
  processName: z.string(),
  jsonld: z.record(z.unknown()), // JSON-LD content
  metadata: z.object({
    lastUpdated: z.date().default(() => new Date()),
    version: z.number().default(1),
  }).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type ProcessContent = z.infer<typeof ProcessContentSchema>;

