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

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { graphqlRequest } from '@/internal/graphql/client';
import {
  CreateEpubDocumentDocument,
  CreateChapterDocument,
  CreateParagraphDocument,
  CreateTextNodeDocument,
  UpdateTextNodeDocument,
  DeleteTextNodeDocument,
  GetTextNodesDocument,
} from '@/generated/graphql';
import { exportEPUB } from '@/internal/epub/export';

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
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
  const [textNodes, setTextNodes] = useState<TextNode[]>([]);
  const [metadata, setMetadata] = useState<MetadataInput>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      setDocument({
        id: result.createEpubDocument.id,
        title: result.createEpubDocument.title,
        metadata: result.createEpubDocument.metadata,
        chapters: result.createEpubDocument.chapters,
        created_at: result.createEpubDocument.createdAt,
        updated_at: result.createEpubDocument.updatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // 章を作成
  const handleCreateChapter = async (title: string) => {
    if (!document) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest(CreateChapterDocument, {
        variables: {
          documentId: document.id,
          title,
          order: chapters.length + 1,
        },
      });

      setChapters([
        ...chapters,
        {
          id: result.createChapter.id,
          title: result.createChapter.title,
          order: result.createChapter.order,
          sections: result.createChapter.sections,
          paragraphs: result.createChapter.paragraphs,
          created_at: result.createChapter.createdAt,
          updated_at: result.createChapter.updatedAt,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chapter');
    } finally {
      setLoading(false);
    }
  };

  // 段落を作成
  const handleCreateParagraph = async (chapterId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest(CreateParagraphDocument, {
        variables: {
          chapterId,
          order: paragraphs.length + 1,
        },
      });

      setParagraphs([
        ...paragraphs,
        {
          id: result.createParagraph.id,
          order: result.createParagraph.order,
          text_nodes: result.createParagraph.textNodes,
          style: result.createParagraph.style,
          created_at: result.createParagraph.createdAt,
          updated_at: result.createParagraph.updatedAt,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create paragraph');
    } finally {
      setLoading(false);
    }
  };

  // テキストノードを作成
  const handleCreateTextNode = async (paragraphId: string, content: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest(CreateTextNodeDocument, {
        variables: {
          paragraphId,
          content,
          order: textNodes.length + 1,
        },
      });

      setTextNodes([
        ...textNodes,
        {
          id: result.createTextNode.id,
          content: result.createTextNode.content,
          order: result.createTextNode.order,
          belongs_to_paragraph: result.createTextNode.belongsToParagraph,
          style: result.createTextNode.style,
          created_at: result.createTextNode.createdAt,
          updated_at: result.createTextNode.updatedAt,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create text node');
    } finally {
      setLoading(false);
    }
  };

  // テキストノードを更新
  const handleUpdateTextNode = async (id: string, content: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest(UpdateTextNodeDocument, {
        variables: {
          id,
          content,
        },
      });

      setTextNodes(
        textNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                content: result.updateTextNode.content,
                updated_at: result.updateTextNode.updatedAt,
              }
            : node
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update text node');
    } finally {
      setLoading(false);
    }
  };

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
          {/* 左サイドバー: 章一覧 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">章</h2>
              <button
                onClick={() => {
                  const title = prompt('章のタイトルを入力:');
                  if (title) handleCreateChapter(title);
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                + 追加
              </button>
            </div>
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`p-3 rounded cursor-pointer ${
                    selectedChapter === chapter.id
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => {
                    setSelectedChapter(chapter.id);
                    setSelectedParagraph(null);
                    setTextNodes([]);
                  }}
                >
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{chapter.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">順序: {chapter.order}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 中央: 段落とテキストノード */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            {selectedChapter ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">段落</h2>
                  <button
                    onClick={() => handleCreateParagraph(selectedChapter)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + 追加
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {paragraphs.map((paragraph) => (
                    <div
                      key={paragraph.id}
                      className={`p-3 rounded cursor-pointer ${
                        selectedParagraph === paragraph.id
                          ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-400'
                          : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={async () => {
                        setSelectedParagraph(paragraph.id);
                        // テキストノードを取得
                        try {
                          const result = await graphqlRequest(GetTextNodesDocument, {
                            variables: {
                              paragraphId: paragraph.id,
                            },
                          });
                          setTextNodes(
                            result.textNodes.map((node) => ({
                              id: node.id,
                              content: node.content,
                              order: node.order,
                              belongs_to_paragraph: node.belongsToParagraph,
                              style: node.style,
                              created_at: node.createdAt,
                              updated_at: node.updatedAt,
                            }))
                          );
                        } catch (err) {
                          console.error('Failed to load text nodes:', err);
                        }
                      }}
                    >
                      <p className="text-sm text-gray-900 dark:text-gray-100">段落 #{paragraph.order}</p>
                    </div>
                  ))}
                </div>

                {/* テキストエディタ */}
                {selectedParagraph && (
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">テキストノード</h3>
                    <div className="space-y-2">
                      {textNodes
                        .filter((node) => node.belongs_to_paragraph === selectedParagraph)
                        .sort((a, b) => a.order - b.order)
                        .map((node) => (
                          <div key={node.id} className="flex gap-2">
                            <input
                              type="text"
                              value={node.content}
                              onChange={(e) =>
                                handleUpdateTextNode(node.id, e.target.value)
                              }
                              className="flex-1 px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  await graphqlRequest(DeleteTextNodeDocument, {
                                    variables: { id: node.id },
                                  });
                                  setTextNodes(textNodes.filter((n) => n.id !== node.id));
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to delete text node');
                                }
                              }}
                              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      <button
                        onClick={() => {
                          const content = prompt('テキストを入力:');
                          if (content) handleCreateTextNode(selectedParagraph, content);
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        + テキストノードを追加
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                章を選択してください
              </div>
            )}
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

