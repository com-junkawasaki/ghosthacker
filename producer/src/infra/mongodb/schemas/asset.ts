import { z } from 'zod';

/**
 * Asset schema for GridFS metadata
 * References files stored in GridFS bucket
 */
export const AssetSchema = z.object({
  _id: z.string().optional(),
  fileId: z.string(), // GridFS file ID
  projectId: z.string(),
  processName: z.string().optional(), // Optional: associated process
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Asset = z.infer<typeof AssetSchema>;

