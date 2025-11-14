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
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateEPUBDocument($title: String!, $metadata: MetadataInput) {
              createEPUBDocument(title: $title, metadata: $metadata) {
                id
                title
                metadata
                chapters
                created_at
                updated_at
              }
            }
          `,
          variables: {
            title: 'New EPUB Document',
            metadata: metadata,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setDocument(result.data.createEPUBDocument);
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
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateChapter($documentId: String!, $title: String!, $order: Int!) {
              createChapter(documentId: $documentId, title: $title, order: $order) {
                id
                title
                order
                sections
                paragraphs
                created_at
                updated_at
              }
            }
          `,
          variables: {
            documentId: document.id,
            title,
            order: chapters.length + 1,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setChapters([...chapters, result.data.createChapter]);
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
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateParagraph($chapterId: String!, $order: Int!) {
              createParagraph(chapterId: $chapterId, order: $order) {
                id
                order
                text_nodes
                style
                created_at
                updated_at
              }
            }
          `,
          variables: {
            chapterId,
            order: paragraphs.length + 1,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setParagraphs([...paragraphs, result.data.createParagraph]);
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
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateTextNode($paragraphId: String!, $content: String!, $order: Int!) {
              createTextNode(paragraphId: $paragraphId, content: $content, order: $order) {
                id
                content
                order
                belongs_to_paragraph
                style
                created_at
                updated_at
              }
            }
          `,
          variables: {
            paragraphId,
            content,
            order: textNodes.length + 1,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setTextNodes([...textNodes, result.data.createTextNode]);
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
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation UpdateTextNode($id: String!, $content: String, $order: Int) {
              updateTextNode(id: $id, content: $content, order: $order) {
                id
                content
                order
                belongs_to_paragraph
                style
                created_at
                updated_at
              }
            }
          `,
          variables: {
            id,
            content,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setTextNodes(
        textNodes.map((node) =>
          node.id === id ? result.data.updateTextNode : node
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">EPUB Editor</h1>
        <p className="text-gray-600">
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">新しいEPUBドキュメントを作成</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="EPUB Document Title"
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                著者
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">章</h2>
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
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedChapter(chapter.id);
                    setSelectedParagraph(null);
                    setTextNodes([]);
                  }}
                >
                  <h3 className="font-medium">{chapter.title}</h3>
                  <p className="text-xs text-gray-500">順序: {chapter.order}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 中央: 段落とテキストノード */}
          <div className="bg-white rounded-lg shadow-md p-4">
            {selectedChapter ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">段落</h2>
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
                          ? 'bg-green-100 border-2 border-green-500'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setSelectedParagraph(paragraph.id);
                        // TODO: テキストノードを取得
                      }}
                    >
                      <p className="text-sm">段落 #{paragraph.order}</p>
                    </div>
                  ))}
                </div>

                {/* テキストエディタ */}
                {selectedParagraph && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">テキストノード</h3>
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <button
                              onClick={() => {
                                // TODO: テキストノードを削除
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
              <div className="text-center text-gray-500 py-8">
                章を選択してください
              </div>
            )}
          </div>

          {/* 右サイドバー: メタデータ編集 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">メタデータ (Dublin Core)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={metadata.title || ''}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  著者
                </label>
                <input
                  type="text"
                  value={metadata.author || ''}
                  onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISBN
                </label>
                <input
                  type="text"
                  value={metadata.isbn || ''}
                  onChange={(e) => setMetadata({ ...metadata, isbn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  言語
                </label>
                <input
                  type="text"
                  value={metadata.language || ''}
                  onChange={(e) => setMetadata({ ...metadata, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出版社
                </label>
                <input
                  type="text"
                  value={metadata.publisher || ''}
                  onChange={(e) => setMetadata({ ...metadata, publisher: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={metadata.description || ''}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

