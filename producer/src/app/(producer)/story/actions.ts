"use server";
// Merkle DAG: story.actions -> validates inputs -> seeds pipeline later
import { safeParse } from 'valibot';
import { ProjectSchema } from '@/types/story';

export type ServerActionResult<T> = { ok: true; value: T } | { ok: false; faults: { code: string; message: string; path?: string[] }[] };

export type ProjectInput = {
  title: string;
  logline: string;
  genres: ('horror' | 'mystery' | 'thriller' | 'romance' | 'sci-fi' | 'fantasy')[];
  tone: 'atmospheric' | 'comedic' | 'dark' | 'hopeful';
  audienceRating: 'PG-13';
  language: 'en';
  keywords?: string[];
};

export async function submitOverview(input: ProjectInput): Promise<ServerActionResult<ProjectInput>> {
  // Validate with Valibot
  const result = safeParse(ProjectSchema, input);
  if (!result.success) {
    const faults = result.issues.map((i) => ({
      code: i.code ?? 'validation_error',
      message: i.message ?? 'Invalid value',
      path: i.path?.map((p) => String(p.key)),
    }));
    return { ok: false, faults };
  }

  // TODO: persist StoryBrief draft (e.g., database or KV). For now, echo back.
  return { ok: true, value: input };
}


