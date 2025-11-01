import { getMongoDb } from '../client';
import { ProjectSchema, type Project } from '../schemas/project';
import { nanoid } from 'nanoid';

const COLLECTION_NAME = 'projects';

/**
 * Project repository for MongoDB operations
 */
export const projectRepository = {
  /**
   * List all projects
   */
  async list(): Promise<Project[]> {
    const db = await getMongoDb();
    const collection = db.collection<Project>(COLLECTION_NAME);
    const projects = await collection.find({}).sort({ updatedAt: -1 }).toArray();
    return projects.map(p => ProjectSchema.parse({ ...p, _id: p._id?.toString() }));
  },

  /**
   * Get project by ID
   */
  async getById(projectId: string): Promise<Project | null> {
    const db = await getMongoDb();
    const collection = db.collection<Project>(COLLECTION_NAME);
    const project = await collection.findOne({ projectId });
    if (!project) return null;
    return ProjectSchema.parse({ ...project, _id: project._id?.toString() });
  },

  /**
   * Create new project
   */
  async create(data: Omit<Project, '_id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const db = await getMongoDb();
    const collection = db.collection<Project>(COLLECTION_NAME);
    const now = new Date();
    const project: Project = {
      ...data,
      projectId: data.projectId || nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    const result = await collection.insertOne(project);
    return ProjectSchema.parse({ ...project, _id: result.insertedId.toString() });
  },

  /**
   * Update project
   */
  async update(projectId: string, data: Partial<Omit<Project, '_id' | 'projectId' | 'createdAt'>>): Promise<Project> {
    const db = await getMongoDb();
    const collection = db.collection<Project>(COLLECTION_NAME);
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    await collection.updateOne({ projectId }, { $set: updateData });
    const updated = await collection.findOne({ projectId });
    if (!updated) throw new Error(`Project ${projectId} not found`);
    return ProjectSchema.parse({ ...updated, _id: updated._id?.toString() });
  },

  /**
   * Delete project
   */
  async delete(projectId: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<Project>(COLLECTION_NAME);
    await collection.deleteOne({ projectId });
  },
};

