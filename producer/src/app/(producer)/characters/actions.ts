'use server';

import { readJsonLd, listJsonLdFiles } from '@/server/lib/jsonld-storage';

/**
 * キャラクター一覧を取得する Server Action
 */
export async function listCharactersAction(): Promise<{ ok: true; data: string[] } | { ok: false; error: string }> {
  try {
    const files = listJsonLdFiles('characters');
    return { ok: true, data: files };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to list characters:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * キャラクターを読み込む Server Action
 */
export async function loadCharacterAction(characterId: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const character = readJsonLd('characters', characterId);
    if (!character) {
      return { ok: false, error: 'Character not found' };
    }
    return { ok: true, data: character };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load character:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

