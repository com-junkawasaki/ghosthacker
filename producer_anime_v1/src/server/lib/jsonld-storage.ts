/**
 * JSON-LD ファイルストレージ管理ユーティリティ
 * 
 * データベースを使わず、`resources/` ディレクトリに JSON-LD ファイルを保存・読み込み
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 * 
 * ⚠️ Server-side only: This module uses Node.js filesystem APIs and cannot be used in client components.
 * This file is located in src/server/lib/ which ensures it's only accessible from server-side code.
 */
import fs from 'node:fs';
import path from 'node:path';

const RESOURCES_BASE = path.join(process.cwd(), 'resources');

export interface JsonLdDocument {
  '@context'?: Record<string, unknown>;
  '@graph'?: unknown[];
  '@id'?: string;
  '@type'?: string | string[];
  [key: string]: unknown;
}

/**
 * JSON-LD ファイルを読み込む
 */
export function readJsonLd<T = JsonLdDocument>(
  category: 'canvas' | 'characters' | 'episodes' | 'translations' | 'epub',
  filename: string
): T | null {
  // 拡張子がない場合は自動追加、サブディレクトリもサポート
  const nameWithExt = filename.endsWith('.jsonld') ? filename : `${filename}.jsonld`;
  const filePath = path.join(RESOURCES_BASE, category, nameWithExt);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to read JSON-LD file: ${filePath}`, error);
    return null;
  }
}

/**
 * JSON-LD ファイルを保存する
 */
export function writeJsonLd(
  category: 'canvas' | 'characters' | 'episodes' | 'translations' | 'epub',
  filename: string,
  data: JsonLdDocument
): void {
  // 拡張子がない場合は自動追加、サブディレクトリもサポート
  const nameWithExt = filename.endsWith('.jsonld') ? filename : `${filename}.jsonld`;
  const fullPath = path.join(RESOURCES_BASE, category, nameWithExt);
  const dirPath = path.dirname(fullPath);
  
  // ディレクトリが存在しない場合は作成（サブディレクトリも含む）
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  try {
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to write JSON-LD file: ${fullPath}`, error);
    throw error;
  }
}

/**
 * JSON-LD ファイルを削除する
 */
export function deleteJsonLd(
  category: 'canvas' | 'characters' | 'episodes' | 'translations' | 'epub',
  filename: string
): boolean {
  const filePath = path.join(RESOURCES_BASE, category, filename);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to delete JSON-LD file: ${filePath}`, error);
    return false;
  }
}

/**
 * カテゴリ内の全ての JSON-LD ファイルをリストアップ
 */
export function listJsonLdFiles(
  category: 'canvas' | 'characters' | 'episodes' | 'translations' | 'epub'
): string[] {
  const dirPath = path.join(RESOURCES_BASE, category);
  
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  try {
    return fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.jsonld'))
      .map(file => file.replace('.jsonld', ''));
  } catch (error) {
    console.error(`Failed to list JSON-LD files in: ${dirPath}`, error);
    return [];
  }
}

/**
 * ファイルパスを取得（相対パス）
 */
export function getJsonLdPath(
  category: 'canvas' | 'characters' | 'episodes' | 'translations' | 'epub',
  filename: string
): string {
  return path.join('resources', category, `${filename}.jsonld`);
}

