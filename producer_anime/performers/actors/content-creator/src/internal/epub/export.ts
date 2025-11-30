/**
 * EPUB/Kindle Export
 * TerminusDBのRDFデータからEPUB/Kindle形式のファイルを生成
 * 
 * @context {
 *   "@id": "ex:EPUBExport",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:EPUBDocument",
 *   "ex:produces": "ex:EPUBFile"
 * }
 */

import { graphqlRequest } from '@/internal/graphql/client';
import {
  GetEpubDocumentDocument,
  GetChaptersDocument,
  GetTextNodesDocument,
} from '@/generated/graphql';

interface EPUBExportOptions {
  documentId: string;
  format: 'epub' | 'kindle';
}

/**
 * EPUB/Kindleファイルをエクスポート
 */
export async function exportEPUB(options: EPUBExportOptions): Promise<Blob> {
  const { documentId, format } = options;

  // ドキュメントを取得
  const docResult = await graphqlRequest(GetEpubDocumentDocument, {
    variables: { id: documentId },
  });

  if (!docResult.epubDocument) {
    throw new Error('Document not found');
  }

  const document = docResult.epubDocument;

  // 章を取得
  const chaptersResult = await graphqlRequest(GetChaptersDocument, {
    variables: { documentId },
  });

  const chapters = chaptersResult.chapters;

  // 各章の段落とテキストノードを取得
  const chapterContents = await Promise.all(
    chapters.map(async (chapter) => {
      // TODO: 段落を取得するGraphQLクエリが必要
      // 現時点では簡易実装
      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        content: '', // 段落とテキストノードから生成
      };
    })
  );

  // EPUB形式のZIPファイルを生成
  // 簡易実装: 実際のEPUB生成ライブラリ（例: epub-gen）を使用
  const epubContent = generateEPUBContent({
    ...document,
    metadata: document.metadata ?? null,
  }, chapterContents);

  return new Blob([epubContent], {
    type: format === 'epub' ? 'application/epub+zip' : 'application/x-mobipocket-ebook',
  });
}

/**
 * EPUBコンテンツを生成（簡易実装）
 */
function generateEPUBContent(
  document: { id: string; title: string; metadata: string | null },
  chapters: Array<{ id: string; title: string; order: number; content: string }>
): string {
  // 簡易実装: 実際のEPUB生成にはepub-genなどのライブラリが必要
  // ここではJSON形式で返す（実際の実装ではZIP形式のEPUBファイルを生成）
  return JSON.stringify(
    {
      title: document.title,
      metadata: document.metadata,
      chapters: chapters.sort((a, b) => a.order - b.order),
    },
    null,
    2
  );
}

