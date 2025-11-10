'use server';

import { writeJsonLd, readJsonLd, type JsonLdDocument } from '@/server/lib/jsonld-storage';
import type { EpubEditorSettings, EpubDocument } from '@/lib/epub-settings';

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

    // ファイル名から拡張子を除去（writeJsonLdが自動的に追加する）
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    writeJsonLd('epub', nameWithoutExt, jsonLd);

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save ePub JSON-LD:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * ePub ドキュメントを読み込む Server Action
 */
export async function loadEpubDocumentAction(
  filename: string = 'epub-document.jsonld'
): Promise<{ ok: true; data: EpubDocument } | { ok: false; error: string }> {
  try {
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    const document = readJsonLd<EpubDocument>('epub', nameWithoutExt);
    if (!document) {
      return { ok: false, error: 'Document not found' };
    }
    return { ok: true, data: document };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load ePub document:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * ePub 設定を保存する Server Action
 */
export async function saveEpubSettingsAction(
  settings: EpubEditorSettings,
  filename: string = 'epub-settings.jsonld'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    writeJsonLd('epub', nameWithoutExt, settings);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save ePub settings:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * ePub 設定を読み込む Server Action
 */
export async function loadEpubSettingsAction(
  filename: string = 'epub-settings.jsonld'
): Promise<{ ok: true; data: EpubEditorSettings } | { ok: false; error: string }> {
  try {
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    const settings = readJsonLd<EpubEditorSettings>('epub', nameWithoutExt);
    if (!settings) {
      return { ok: false, error: 'Settings not found' };
    }
    return { ok: true, data: settings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load ePub settings:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

