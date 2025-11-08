/**
 * Kindleエクスポート機能
 * 
 * ePub3からKindle形式（MOBI/AZW3）への変換
 * KindleGen/Calibreを使用
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
import type { EpubDocument, EpubEditorSettings } from './epub-settings';
import { exportEpub3 } from './epub-export';

/**
 * Kindle形式（MOBI/AZW3）にエクスポート
 * 
 * 注意: この実装はサーバー側でKindleGen/Calibreを実行する必要があります
 * クライアント側ではePub3を生成し、サーバーに送信して変換を依頼します
 */
export async function exportKindle(
  document: EpubDocument,
  settings: EpubEditorSettings,
  metadata: {
    title: string;
    author: string;
    language?: string;
    publisher?: string;
  },
  format: 'mobi' | 'azw3' = 'azw3'
): Promise<Blob> {
  // まずePub3を生成
  const epubBlob = await exportEpub3(document, settings, metadata);

  // TODO: サーバー側でKindleGen/Calibreを使用して変換
  // 現在はプレースホルダー
  // 実際の実装では、ePub3ファイルをサーバーに送信し、
  // Rust GraphQL ActivityでKindleGen/Calibreを実行

  throw new Error('Kindle export requires server-side conversion with KindleGen/Calibre');
}

/**
 * Kindleファイルをダウンロード
 */
export async function downloadKindle(
  document: EpubDocument,
  settings: EpubEditorSettings,
  metadata: { title: string; author: string; language?: string; publisher?: string },
  format: 'mobi' | 'azw3' = 'azw3',
  filename?: string
): Promise<void> {
  const blob = await exportKindle(document, settings, metadata, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `book.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

