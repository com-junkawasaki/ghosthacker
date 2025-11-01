import { MongoClient, type Db, type GridFSBucket } from 'mongodb';
import { env } from '@/env';

let client: MongoClient | null = null;
let db: Db | null = null;
let gridfsBucket: GridFSBucket | null = null;

/**
 * Get MongoDB client instance (singleton pattern)
 * @see https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/
 */
export function getMongoClient(): MongoClient {
  if (!client) {
    client = new MongoClient(env.MONGODB_URI);
  }
  return client;
}

/**
 * Get MongoDB database instance
 */
export async function getMongoDb(): Promise<Db> {
  const mongoClient = getMongoClient();
  if (!db) {
    await mongoClient.connect();
    db = mongoClient.db(env.MONGODB_DB_NAME);
  }
  return db;
}

/**
 * Get GridFS bucket for file storage (images, documents)
 * @see https://www.mongodb.com/docs/manual/core/gridfs/
 */
export async function getGridFSBucket(): Promise<GridFSBucket> {
  const database = await getMongoDb();
  if (!gridfsBucket) {
    gridfsBucket = new GridFSBucket(database, { bucketName: 'assets' });
  }
  return gridfsBucket;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    gridfsBucket = null;
  }
}

