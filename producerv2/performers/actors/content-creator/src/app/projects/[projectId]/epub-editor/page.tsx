/**
 * EPUB Editor Page
 * RDFベースのEPUBエディタ
 * 
 * @context {
 *   "@id": "ex:EPUBEditor",
 *   "@type": "ex:Activity",
 *   "ex:provides": "ex:EPUBEditing"
 * }
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { graphqlRequest } from '@/internal/graphql/client';
import {
  CreateEpubDocumentDocument,
  CreateChapterDocument,
  CreateParagraphDocument,
  CreateTextNodeDocument,
  UpdateParagraphDocument,
  DeleteTextNodeDocument,
  GetParagraphsDocument,
  GetTextNodesDocument,
  GetEpubDocumentDocument,
  GetChaptersDocument,
} from '@/generated/graphql';
import { exportEPUB } from '@/internal/epub/export';
import { TipTapEditor } from '@/internal/epub/TipTapEditor';
import { epubToTipTap, tiptapToEPUB } from '@/internal/epub/tiptap-converter';
import { JSONContent } from '@tiptap/core';

interface EPUBDocument {
  id: string;
  title: string;
  metadata: string | null;
  chapters: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  sections: string[] | null;
  paragraphs: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Paragraph {
  id: string;
  order: number;
  text_nodes: string[] | null;
  style: string | null;
  created_at: string;
  updated_at: string;
}

interface TextNode {
  id: string;
  content: string;
  order: number;
  belongs_to_paragraph: string;
  style: string | null;
  created_at: string;
  updated_at: string;
}

interface MetadataInput {
  title?: string | null;
  author?: string | null;
  isbn?: string | null;
  language?: string | null;
  publisher?: string | null;
  date?: string | null;
  description?: string | null;
}

export default function EPUBEditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [document, setDocument] = useState<EPUBDocument | null>(null);
  const [defaultChapterId, setDefaultChapterId] = useState<string | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [textNodes, setTextNodes] = useState<TextNode[]>([]);
  const [tiptapContent, setTipTapContent] = useState<JSONContent>({ type: 'doc', content: [] });
  const [metadata, setMetadata] = useState<MetadataInput>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // デフォルトChapterを取得または作成
  const getOrCreateDefaultChapter = useCallback(async (docId: string): Promise<string> => {
    try {
      // 既存のChapterを取得
      const chaptersResult = await graphqlRequest(GetChaptersDocument, {
        variables: { documentId: docId },
      });

      if (chaptersResult.chapters && chaptersResult.chapters.length > 0) {
        // 最初のChapterを使用（またはorder=1のChapter）
        const defaultChapter = chaptersResult.chapters.find((c) => c.order === 1) || chaptersResult.chapters[0];
        return defaultChapter.id;
      }

      // Chapterが存在しない場合は作成
      const chapterResult = await graphqlRequest(CreateChapterDocument, {
        variables: {
          documentId: docId,
          isEpub: true,
          title: 'Content',
          order: 1,
        },
      });

      return chapterResult.createChapter.id;
    } catch (err) {
      console.error('Failed to get or create default chapter:', err);
      throw err;
    }
  }, []);

  // 新しいEPUBドキュメントを作成
  const handleCreateDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest(CreateEpubDocumentDocument, {
        variables: {
          title: metadata.title || 'New EPUB Document',
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        },
      });

      const newDocument: EPUBDocument = {
        id: result.createEpubDocument.id,
        title: result.createEpubDocument.title,
        metadata: result.createEpubDocument.metadata,
        chapters: result.createEpubDocument.chapters,
        created_at: result.createEpubDocument.createdAt,
        updated_at: result.createEpubDocument.updatedAt,
      };

      setDocument(newDocument);

      // localStorageに保存
      localStorage.setItem(`epub_document_${projectId}`, newDocument.id);

      // デフォルトChapterを取得または作成
      const chapterId = await getOrCreateDefaultChapter(newDocument.id);
      setDefaultChapterId(chapterId);

      // Document全体のコンテンツを読み込む
      await loadDocumentContent(newDocument.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // Document全体のParagraphとTextNodeを読み込んでTipTap JSONに変換
  const loadDocumentContent = useCallback(async (documentId: string) => {
    try {
      setLoading(true);
      // Document全体のParagraphsを取得
      const paragraphsResult = await graphqlRequest(GetParagraphsDocument, {
        variables: { documentId },
      });

      const loadedParagraphs = paragraphsResult.paragraphs;
      setParagraphs(
        loadedParagraphs.map((p) => ({
          id: p.id,
          order: p.order,
          text_nodes: p.textNodes,
          style: p.style,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        }))
      );

      // 各ParagraphのTextNodeを取得
      const allTextNodes: TextNode[] = [];
      for (const paragraph of loadedParagraphs) {
        try {
          const textNodesResult = await graphqlRequest(GetTextNodesDocument, {
            variables: { paragraphId: paragraph.id },
          });
          allTextNodes.push(
            ...textNodesResult.textNodes.map((tn) => ({
              id: tn.id,
              content: tn.content,
              order: tn.order,
              belongs_to_paragraph: tn.belongsToParagraph,
              style: tn.style,
              created_at: tn.createdAt,
              updated_at: tn.updatedAt,
            }))
          );
        } catch (err) {
          console.error(`Failed to load text nodes for paragraph ${paragraph.id}:`, err);
        }
      }
      setTextNodes(allTextNodes);

      // EPUB構造をTipTap JSONに変換
      const paragraphData = loadedParagraphs.map((p) => ({
        id: p.id,
        order: p.order,
        style: p.style,
        textNodes: allTextNodes
          .filter((tn) => tn.belongs_to_paragraph === p.id)
          .map((tn) => ({
            id: tn.id,
            content: tn.content,
            order: tn.order,
            style: tn.style,
          })),
      }));

      const tiptapJSON = epubToTipTap(paragraphData);
      setTipTapContent(tiptapJSON);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document content');
      console.error('Failed to load document content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // TipTapコンテンツの変更を保存（デバウンス付き）
  const handleTipTapUpdate = useCallback(
    async (content: JSONContent) => {
      setTipTapContent(content);

      // デバウンス: 500ms後に保存
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(async () => {
        if (!document || !defaultChapterId) return;

        try {
          // TipTap JSONをEPUB構造に変換
          const { paragraphs: newParagraphs } = tiptapToEPUB(content, defaultChapterId);

          // 既存のParagraphとTextNodeを更新または新規作成
          for (const newParagraph of newParagraphs) {
            // 既存のParagraphを探す（orderでマッチング）
            const existingParagraph = paragraphs.find((p) => p.order === newParagraph.order);

            if (existingParagraph) {
              // 既存のParagraphを更新
              await graphqlRequest(UpdateParagraphDocument, {
                variables: {
                  id: existingParagraph.id,
                  order: newParagraph.order,
                },
              });

              // 既存のTextNodeを削除してから新規作成
              const existingTextNodes = textNodes.filter(
                (tn) => tn.belongs_to_paragraph === existingParagraph.id
              );
              for (const textNode of existingTextNodes) {
                try {
                  await graphqlRequest(DeleteTextNodeDocument, {
                    variables: { id: textNode.id },
                  });
                } catch (err) {
                  console.error(`Failed to delete text node ${textNode.id}:`, err);
                }
              }

              // 新しいTextNodeを作成
              for (const textNode of newParagraph.textNodes) {
                await graphqlRequest(CreateTextNodeDocument, {
                  variables: {
                    paragraphId: existingParagraph.id,
                    content: textNode.content,
                    order: textNode.order,
                  },
                });
              }
            } else {
              // 新しいParagraphを作成
              const paragraphResult = await graphqlRequest(CreateParagraphDocument, {
                variables: {
                  chapterId: defaultChapterId,
                  order: newParagraph.order,
                },
              });

              // TextNodeを作成
              for (const textNode of newParagraph.textNodes) {
                await graphqlRequest(CreateTextNodeDocument, {
                  variables: {
                    paragraphId: paragraphResult.createParagraph.id,
                    content: textNode.content,
                    order: textNode.order,
                  },
                });
              }
            }
          }

          // データを再読み込み
          await loadDocumentContent(document.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save content');
          console.error('Failed to save content:', err);
        }
      }, 500);

      setSaveTimeout(timeout);
    },
    [document, defaultChapterId, paragraphs, textNodes, saveTimeout, loadDocumentContent]
  );

  // 既存のEPUBドキュメントを読み込む（URLパラメータから）
  useEffect(() => {
    const loadExistingDocument = async () => {
      // URLパラメータからdocumentIdを取得（将来の実装）
      // または、localStorageから取得
      const savedDocumentId = localStorage.getItem(`epub_document_${projectId}`);
      if (savedDocumentId) {
        try {
          const result = await graphqlRequest(GetEpubDocumentDocument, {
            variables: { id: savedDocumentId },
          });

          if (result.epubDocument) {
            const loadedDocument: EPUBDocument = {
              id: result.epubDocument.id,
              title: result.epubDocument.title,
              metadata: result.epubDocument.metadata,
              chapters: result.epubDocument.chapters,
              created_at: result.epubDocument.createdAt,
              updated_at: result.epubDocument.updatedAt,
            };

            setDocument(loadedDocument);

            // デフォルトChapterを取得または作成
            const chapterId = await getOrCreateDefaultChapter(loadedDocument.id);
            setDefaultChapterId(chapterId);

            // Document全体のコンテンツを読み込む
            await loadDocumentContent(loadedDocument.id);
          }
        } catch (err) {
          console.error('Failed to load existing document:', err);
        }
      }
    };

    loadExistingDocument();
  }, [projectId, getOrCreateDefaultChapter, loadDocumentContent]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">EPUB Editor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          RDFベースのEPUBエディタ - テキストノードをRDFリソースとして管理
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* ドキュメント作成 */}
      {!document && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">新しいEPUBドキュメントを作成</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                タイトル
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="EPUB Document Title"
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                著者
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="Author Name"
                onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
              />
            </div>
            <button
              onClick={handleCreateDocument}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '作成中...' : 'ドキュメントを作成'}
            </button>
          </div>
        </div>
      )}

      {/* エディタ */}
      {document && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 中央: TipTap WYSIWYGエディタ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:col-span-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {document.title}
              </h2>
              {loading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  読み込み中...
                </div>
              ) : (
                <TipTapEditor
                  content={tiptapContent}
                  onUpdate={handleTipTapUpdate}
                  placeholder="コンテンツを入力してください..."
                />
              )}
            </div>
          </div>

          {/* 右サイドバー: メタデータ編集とエクスポート */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">メタデータ (Dublin Core)</h2>
              {document && (
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const blob = await exportEPUB({
                          documentId: document.id,
                          format: 'epub',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${document.title}.epub`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to export EPUB');
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    EPUB出力
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await exportEPUB({
                          documentId: document.id,
                          format: 'kindle',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${document.title}.mobi`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to export Kindle');
                      }
                    }}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                  >
                    Kindle出力
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={metadata.title || ''}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  著者
                </label>
                <input
                  type="text"
                  value={metadata.author || ''}
                  onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ISBN
                </label>
                <input
                  type="text"
                  value={metadata.isbn || ''}
                  onChange={(e) => setMetadata({ ...metadata, isbn: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  言語
                </label>
                <input
                  type="text"
                  value={metadata.language || ''}
                  onChange={(e) => setMetadata({ ...metadata, language: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  出版社
                </label>
                <input
                  type="text"
                  value={metadata.publisher || ''}
                  onChange={(e) => setMetadata({ ...metadata, publisher: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  説明
                </label>
                <textarea
                  value={metadata.description || ''}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

