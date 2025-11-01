import { getMongoDb, getGridFSBucket } from '../client';
import { AssetSchema, type Asset } from '../schemas/asset';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'assets';

/**
 * Asset repository for GridFS operations
 */
export const assetRepository = {
  /**
   * Upload file to GridFS
   */
  async upload(
    projectId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
    processName?: string,
    metadata?: Record<string, unknown>,
  ): Promise<Asset> {
    const bucket = await getGridFSBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        projectId,
        processName,
        ...metadata,
      },
    });

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', async () => {
        const fileId = uploadStream.id.toString();
        const db = await getMongoDb();
        const collection = db.collection<Asset>(COLLECTION_NAME);
        const fileInfo = await bucket.find({ _id: uploadStream.id }).next();
        if (!fileInfo) {
          reject(new Error('Failed to retrieve uploaded file info'));
          return;
        }
        const asset: Asset = {
          fileId,
          projectId,
          processName,
          filename,
          contentType,
          size: fileInfo.length,
          metadata,
          createdAt: new Date(),
        };
        await collection.insertOne(asset);
        resolve(AssetSchema.parse({ ...asset, _id: asset._id?.toString() }));
      });
      uploadStream.on('error', reject);
      uploadStream.end(buffer);
    });
  },

  /**
   * Get asset download stream
   */
  async getDownloadStream(fileId: string) {
    const bucket = await getGridFSBucket();
    return bucket.openDownloadStream(new ObjectId(fileId));
  },

  /**
   * Get asset metadata
   */
  async getById(fileId: string): Promise<Asset | null> {
    const db = await getMongoDb();
    const collection = db.collection<Asset>(COLLECTION_NAME);
    const asset = await collection.findOne({ fileId });
    if (!asset) return null;
    return AssetSchema.parse({ ...asset, _id: asset._id?.toString() });
  },

  /**
   * List assets by project
   */
  async listByProject(projectId: string, processName?: string): Promise<Asset[]> {
    const db = await getMongoDb();
    const collection = db.collection<Asset>(COLLECTION_NAME);
    const query = processName ? { projectId, processName } : { projectId };
    const assets = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return assets.map(a => AssetSchema.parse({ ...a, _id: a._id?.toString() }));
  },

  /**
   * Delete asset
   */
  async delete(fileId: string): Promise<void> {
    const bucket = await getGridFSBucket();
    await bucket.delete(new ObjectId(fileId));
    const db = await getMongoDb();
    const collection = db.collection<Asset>(COLLECTION_NAME);
    await collection.deleteOne({ fileId });
  },
};

