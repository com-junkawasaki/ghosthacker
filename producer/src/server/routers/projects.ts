import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { projectRepository } from '@/infra/mongodb/repositories/project-repo';
import { processContentRepository } from '@/infra/mongodb/repositories/process-content-repo';
import { assetRepository } from '@/infra/mongodb/repositories/asset-repo';
import { generateJSONLDContent, enhanceJSONLDContent } from '@/lib/openai/jsonld-generator';

export const projectsRouter = router({
  /**
   * List all projects
   */
  list: publicProcedure.query(async () => {
    return await projectRepository.list();
  }),

  /**
   * Get project by ID
   */
  getById: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const project = await projectRepository.getById(input.projectId);
      if (!project) {
        throw new Error(`Project ${input.projectId} not found`);
      }
      return project;
    }),

  /**
   * Create new project
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        jsonld: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await projectRepository.create({
        projectId: '', // Will be generated
        name: input.name,
        description: input.description,
        jsonld: input.jsonld,
        processes: [],
      });
    }),

  /**
   * Update project
   */
  update: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        jsonld: z.record(z.unknown()).optional(),
        processes: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { projectId, ...updateData } = input;
      return await projectRepository.update(projectId, updateData);
    }),

  /**
   * Delete project
   */
  delete: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      await projectRepository.delete(input.projectId);
      return { ok: true } as const;
    }),

  /**
   * Get process content
   */
  getProcessContent: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        processName: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await processContentRepository.get(input.projectId, input.processName);
    }),

  /**
   * Update process content (JSON-LD)
   */
  updateProcessContent: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        processName: z.string(),
        jsonld: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ input }) => {
      return await processContentRepository.upsert(
        input.projectId,
        input.processName,
        input.jsonld,
      );
    }),

  /**
   * List all process contents for a project
   */
  listProcessContents: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return await processContentRepository.listByProject(input.projectId);
    }),

  /**
   * Upload asset (image/document) to GridFS
   */
  uploadAsset: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        filename: z.string(),
        contentType: z.string(),
        data: z.string(), // Base64 encoded
        processName: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.data, 'base64');
      return await assetRepository.upload(
        input.projectId,
        input.filename,
        buffer,
        input.contentType,
        input.processName,
        input.metadata,
      );
    }),

  /**
   * List assets for a project
   */
  listAssets: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        processName: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await assetRepository.listByProject(input.projectId, input.processName);
    }),

  /**
   * Delete asset
   */
  deleteAsset: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input }) => {
      await assetRepository.delete(input.fileId);
      return { ok: true } as const;
    }),

  /**
   * Generate JSON-LD content using OpenAI
   */
  generateJSONLD: publicProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        context: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const content = await generateJSONLDContent(input.prompt, input.context);
        return { ok: true as const, content };
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : 'Failed to generate content',
        };
      }
    }),

  /**
   * Enhance existing JSON-LD content using OpenAI
   */
  enhanceJSONLD: publicProcedure
    .input(
      z.object({
        existingContent: z.record(z.unknown()),
        enhancementPrompt: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const enhanced = await enhanceJSONLDContent(
          input.existingContent,
          input.enhancementPrompt,
        );
        return { ok: true as const, content: enhanced };
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : 'Failed to enhance content',
        };
      }
    }),
});

