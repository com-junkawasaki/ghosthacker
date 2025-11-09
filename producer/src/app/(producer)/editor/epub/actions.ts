'use server';

import { writeJsonLd, type JsonLdDocument } from '@/lib/jsonld-storage';

/**
 * ePub エディタの JSON-LD をファイルに保存する Server Action
 * 
 * @param jsonLd - 保存する JSON-LD データ
 * @param filename - ファイル名（デフォルト: 'epub-document.jsonld'）
 * @returns 保存結果
 */
export async function saveEpubJsonLd(
  jsonLd: JsonLdDocument,
  filename: string = 'epub-document.jsonld'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // JSON-LD のバリデーション（基本的な構造チェック）
    if (!jsonLd || typeof jsonLd !== 'object') {
      return { ok: false, error: 'Invalid JSON-LD data' };
    }

    // ファイルに保存
    writeJsonLd('epub', filename, jsonLd);

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save ePub JSON-LD:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

