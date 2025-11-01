import { getMongoDb } from '../client';
import { ProcessContentSchema, type ProcessContent } from '../schemas/process-content';

const COLLECTION_NAME = 'processContents';

/**
 * Process content repository for MongoDB operations
 */
export const processContentRepository = {
  /**
   * Get process content
   */
  async get(projectId: string, processName: string): Promise<ProcessContent | null> {
    const db = await getMongoDb();
    const collection = db.collection<ProcessContent>(COLLECTION_NAME);
    const content = await collection.findOne({ projectId, processName });
    if (!content) return null;
    return ProcessContentSchema.parse({ ...content, _id: content._id?.toString() });
  },

  /**
   * Upsert process content (create or update)
   */
  async upsert(
    projectId: string,
    processName: string,
    jsonld: Record<string, unknown>,
  ): Promise<ProcessContent> {
    const db = await getMongoDb();
    const collection = db.collection<ProcessContent>(COLLECTION_NAME);
    const now = new Date();
    const existing = await collection.findOne({ projectId, processName });

    if (existing) {
      const updateData: Partial<ProcessContent> = {
        jsonld,
        updatedAt: now,
        metadata: {
          lastUpdated: now,
          version: (existing.metadata?.version || 1) + 1,
        },
      };
      await collection.updateOne({ projectId, processName }, { $set: updateData });
      const updated = await collection.findOne({ projectId, processName });
      if (!updated) throw new Error(`Process content not found after update`);
      return ProcessContentSchema.parse({ ...updated, _id: updated._id?.toString() });
    } else {
      const newContent: ProcessContent = {
        projectId,
        processName,
        jsonld,
        createdAt: now,
        updatedAt: now,
        metadata: {
          lastUpdated: now,
          version: 1,
        },
      };
      const result = await collection.insertOne(newContent);
      return ProcessContentSchema.parse({ ...newContent, _id: result.insertedId.toString() });
    }
  },

  /**
   * List all process contents for a project
   */
  async listByProject(projectId: string): Promise<ProcessContent[]> {
    const db = await getMongoDb();
    const collection = db.collection<ProcessContent>(COLLECTION_NAME);
    const contents = await collection.find({ projectId }).sort({ createdAt: 1 }).toArray();
    return contents.map(c => ProcessContentSchema.parse({ ...c, _id: c._id?.toString() }));
  },

  /**
   * Delete process content
   */
  async delete(projectId: string, processName: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<ProcessContent>(COLLECTION_NAME);
    await collection.deleteOne({ projectId, processName });
  },
};

