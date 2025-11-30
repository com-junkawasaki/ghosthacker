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
import { exportEPUB } from '@/internal/epub/export';
import { TipTapEditor } from '@/internal/epub/TipTapEditor';
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
  const [tiptapContent, setTipTapContent] = useState<JSONContent>({ type: 'doc', content: [] });
  const [metadata, setMetadata] = useState<MetadataInput>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // デフォルトChapterを取得または作成
  const getOrCreateDefaultChapter = useCallback(async (docId: string): Promise<string> => {
    try {
      // 既存のChapterを取得
      const chaptersResponse = await fetch(`/api/grpc/epub/chapters?document_id=${docId}&is_epub=true`);
      if (!chaptersResponse.ok) {
        throw new Error(`HTTP error! status: ${chaptersResponse.status}`);
      }
      const chaptersData = await chaptersResponse.json();

      if (chaptersData.chapters && chaptersData.chapters.length > 0) {
        // 最初のChapterを使用（またはorder=1のChapter）
        const defaultChapter = chaptersData.chapters.find((c: any) => c.order === 1) || chaptersData.chapters[0];
        if (!defaultChapter) {
          throw new Error('No chapter found');
        }
        return defaultChapter.id;
      }

      // Chapterが存在しない場合は作成
      const chapterResponse = await fetch('/api/grpc/epub/chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epub_document_id: docId,
          title: 'Content',
          order: 1,
        }),
      });

      if (!chapterResponse.ok) {
        throw new Error(`HTTP error! status: ${chapterResponse.status}`);
      }
      const chapterData = await chapterResponse.json();

      if (!chapterData.chapter) {
        throw new Error('Failed to create chapter');
      }
      return chapterData.chapter.id;
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
      const response = await fetch('/api/grpc/epub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: metadata.title || 'New EPUB Document',
          metadata_id: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const newDocument: EPUBDocument = {
        id: data.epubDocument.id,
        title: data.epubDocument.title,
        metadata: data.epubDocument.metadata_id ?? null,
        chapters: null,
        created_at: data.epubDocument.createdAt,
        updated_at: data.epubDocument.updatedAt,
      };

      setDocument(newDocument);

      // localStorageに保存
      localStorage.setItem(`epub_document_${projectId}`, newDocument.id);

      // デフォルトChapterを取得または作成（後方互換性のため）
      const chapterId = await getOrCreateDefaultChapter(newDocument.id);
      setDefaultChapterId(chapterId);

      // TipTapコンテンツを読み込む（存在する場合）
      if (data.epubDocument.tiptap_content) {
        try {
          setTipTapContent(JSON.parse(data.epubDocument.tiptap_content) as JSONContent);
        } catch {
          setTipTapContent({ type: 'doc', content: [] });
        }
      } else {
        setTipTapContent({ type: 'doc', content: [] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // Document全体のTipTapコンテンツを読み込む
  const loadDocumentContent = useCallback(async (documentId: string) => {
    try {
      setLoading(true);
      // EPUBDocumentを取得（tiptapContentを含む）
      const response = await fetch(`/api/grpc/epub/${documentId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.epubDocument?.tiptap_content) {
        try {
          // TipTap JSONを直接使用
          setTipTapContent(JSON.parse(data.epubDocument.tiptap_content) as JSONContent);
        } catch {
          setTipTapContent({ type: 'doc', content: [] });
        }
      } else {
        // TipTapコンテンツが存在しない場合は空のドキュメントを設定
        setTipTapContent({ type: 'doc', content: [] });
      }
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
        if (!document) return;

        try {
          // TipTap JSONを直接データベースに保存
          await fetch(`/api/grpc/epub/${document.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tiptap_content: content,
            }),
          });

          // データを再読み込み（オプション）
          // await loadDocumentContent(document.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save content');
          console.error('Failed to save content:', err);
        }
      }, 500);

      setSaveTimeout(timeout);
    },
    [document, saveTimeout]
  );

  // 既存のEPUBドキュメントを読み込む（URLパラメータから）
  useEffect(() => {
    const loadExistingDocument = async () => {
      // URLパラメータからdocumentIdを取得（将来の実装）
      // または、localStorageから取得
      const savedDocumentId = localStorage.getItem(`epub_document_${projectId}`);
      if (savedDocumentId) {
        try {
          const response = await fetch(`/api/grpc/epub/${savedDocumentId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();

          if (result.epubDocument) {
            const loadedDocument: EPUBDocument = {
              id: result.epubDocument.id,
              title: result.epubDocument.title,
              metadata: result.epubDocument.metadata_id ?? null,
              chapters: null,
              created_at: result.epubDocument.createdAt,
              updated_at: result.epubDocument.updatedAt,
            };

            setDocument(loadedDocument);

            // デフォルトChapterを取得または作成（後方互換性のため）
            const chapterId = await getOrCreateDefaultChapter(loadedDocument.id);
            setDefaultChapterId(chapterId);

            // TipTapコンテンツを読み込む
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
                        const a = window.document.createElement('a');
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
                        const a = window.document.createElement('a');
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

