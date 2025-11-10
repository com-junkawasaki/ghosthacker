'use server';

import { readJsonLd, listJsonLdFiles } from '@/lib/jsonld-storage';

/**
 * エピソード一覧を取得する Server Action
 */
export async function listEpisodesAction(): Promise<{ ok: true; data: string[] } | { ok: false; error: string }> {
  try {
    const files = listJsonLdFiles('episodes');
    return { ok: true, data: files };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to list episodes:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * エピソードを読み込む Server Action
 */
export async function loadEpisodeAction(episodeId: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const episode = readJsonLd('episodes', episodeId);
    if (!episode) {
      return { ok: false, error: 'Episode not found' };
    }
    return { ok: true, data: episode };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load episode:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

