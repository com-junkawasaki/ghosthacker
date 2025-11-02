import { z } from "zod";
import { router, publicProcedure } from '../trpc';
import { storyRepository } from '@/infra/mongodb/repositories/story-repo';
import { TONES, STRUCTURES } from "@/app/(producer)/canvas/story/types";

const PROJECT_ID = 'ghost-hacker-project'; // FIXME: Should not be hardcoded

const BeatSchema = z.object({
  id: z.string(),
  label: z.string(),
  purpose: z.enum(['setup', 'conflict', 'climax']),
  targetLength: z.number(),
});

const MediaObjectSchema = z.object({
  "@type": z.union([
    z.literal("schema:TextDigitalDocument"),
    z.literal("schema:ImageObject"),
    z.literal("schema:VideoObject"),
    z.literal("schema:AudioObject"),
  ]),
  "schema:contentUrl": z.string(),
  "schema:name": z.string().optional(),
  "schema:description": z.string().optional(),
});

const EpisodeInputSchema = z.object({
  "@id": z.string(),
  "schema:name": z.string(),
  "schema:episodeNumber": z.string(),
  "gh:hasPart": z.array(MediaObjectSchema).optional(),
});


export const storyRouter = router({
  submitOverview: publicProcedure
    .input(z.object({
      title: z.string(),
      logline: z.string(),
      genres: z.array(z.string()),
      tone: z.enum(TONES),
      audienceRating: z.string(),
      language: z.string(),
      keywords: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveProject({
          id: PROJECT_ID,
          ...input,
        });
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save project overview', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),

  loadProject: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getProject(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load project', error);
        return null;
      }
    }),
  submitNarrative: publicProcedure
    .input(z.object({
      synopsis: z.string(),
      structure: z.enum(STRUCTURES),
      beats: z.array(BeatSchema),
    }))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveNarrative(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save narrative', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadNarrative: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getNarrative(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load narrative', error);
        return null;
      }
    }),
  submitCharacters: publicProcedure
    .input(z.array(z.object({
      name: z.string(),
      role: z.enum(['protagonist', 'antagonist', 'support']),
      motivation: z.string().optional(),
      conflict: z.string().optional(),
      voice: z.string().optional(),
    })))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveCharacters(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save characters', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadCharacters: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getCharacters(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load characters', error);
        return [];
      }
    }),
  submitBackstories: publicProcedure
    .input(z.array(z.object({
      origin: z.string(),
      motivation: z.string().optional(),
      conflict: z.string().optional(),
      characterName: z.string().optional(),
    })))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveBackstories(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save backstories', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadBackstories: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getBackstories(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load backstories', error);
        return [];
      }
    }),
  submitEpisodes: publicProcedure
    .input(z.array(EpisodeInputSchema))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveEpisodes(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save episodes', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadEpisodes: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getEpisodes(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load episodes', error);
        return [];
      }
    }),
  submitStyles: publicProcedure
    .input(z.object({
      visual: z.object({
        artStyle: z.string(),
        palette: z.string(),
        nsfwAllowed: z.boolean(),
      }),
      audio: z.object({
        voice: z.string(),
        tempo: z.string(),
        musicMood: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.saveStyles(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save styles', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadStyles: publicProcedure
    .query(async () => {
      try {
        return await storyRepository.getStyles(PROJECT_ID);
      } catch (error) {
        console.error('Failed to load styles', error);
        return null;
      }
    }),
  submitPlatforms: publicProcedure
    .input(z.object({
      wattpad: z.object({
        chapterCount: z.number(),
        includeImages: z.boolean(),
        chapterLengthWords: z.tuple([z.number(), z.number()]),
        imageFrequency: z.enum(['none', 'cover', 'inline-1', 'inline-3']),
      }),
      webtoon: z.object({
        episodePanels: z.number(),
        bubbleDensity: z.enum(['low', 'medium', 'high']),
        readingPace: z.enum(['slow', 'standard', 'fast']),
        soundEffects: z.boolean(),
      }),
      youtube: z.object({
        targetDurationSec: z.number(),
        aspectRatio: z.enum(['9:16', '16:9']),
        captions: z.boolean(),
        brollRatio: z.number(),
      }),
    }))
    .mutation(async ({ input }) => {
      try {
        await storyRepository.savePlatforms(PROJECT_ID, input);
        return { ok: true, faults: [] };
      } catch (error) {
        console.error('Failed to save platforms', error);
        return { ok: false, faults: [{ message: (error as Error).message }] };
      }
    }),
  loadPlatforms: publicProcedure
    .query(async () => {
      try {
        const platforms = await storyRepository.getPlatforms(PROJECT_ID);
        if (!platforms) return null;
        return {
          wattpad: platforms.wattpad,
          webtoon: platforms.webtoon,
          youtube: platforms.youtube,
        };
      } catch (error) {
        console.error('Failed to load platforms', error);
        return null;
      }
    }),
});
