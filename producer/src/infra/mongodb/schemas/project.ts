import { z } from 'zod';

/**
 * Project schema for MongoDB
 * @see https://schema.org/CreativeWork
 */
export const ProjectSchema = z.object({
  _id: z.string().optional(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  jsonld: z.record(z.unknown()).optional(), // JSON-LD metadata
  processes: z.array(z.string()).default([]), // Process names
});

export type Project = z.infer<typeof ProjectSchema>;

