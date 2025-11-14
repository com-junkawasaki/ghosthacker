/**
 * Kindle Editor Page
 * RDFベースのKindleエディタ
 * 
 * @context {
 *   "@id": "ex:KindleEditor",
 *   "@type": "ex:Activity",
 *   "ex:provides": "ex:KindleEditing"
 * }
 */

'use client';

// EPUBエディタと同様の実装（将来Kindle専用機能を追加可能）
export { default } from '../epub-editor/page';

