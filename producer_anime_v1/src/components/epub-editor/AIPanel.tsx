'use client';

import { useState, useCallback } from 'react';
import { graphqlClient, episodeMutations } from '@/lib/graphql-client';

interface AIPanelProps {
  selectedText?: string;
  cursorPosition?: { x: number; y: number };
  characterId?: string;
  onGenerateText?: (text: string) => void;
  onGenerateImage?: (imageUrl: string) => void;
  onGenerateDialogue?: (dialogue: unknown) => void;
  onClose?: () => void;
}

/**
 * LLM統合AIパネルコンポーネント
 * 
 * テキスト生成、画像生成、会話生成を統合
 */
export default function AIPanel({
  selectedText,
  cursorPosition,
  characterId,
  onGenerateText,
  onGenerateImage,
  onGenerateDialogue,
  onClose,
}: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  // テキスト生成（続き）
  const handleGenerateNext = useCallback(async () => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: LLM API呼び出しを実装
      // 現在はGraphQL mutationを使用
      const context = await loadContextForGeneration();
      const prompt = `Continue the following text:\n\n${selectedText}\n\nContext: ${JSON.stringify(context)}`;
      
      // プレースホルダー: 実際のLLM呼び出しに置き換え
      const generated = `[Generated continuation based on: ${selectedText}]`;
      
      setGeneratedContent(generated);
      if (onGenerateText) {
        onGenerateText(generated);
      }
    } catch (err) {
      setError(`Failed to generate text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedText, onGenerateText]);

  // テキスト改善
  const handleImprove = useCallback(async () => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: LLM API呼び出しを実装
      const improved = `[Improved version of: ${selectedText}]`;
      
      setGeneratedContent(improved);
      if (onGenerateText) {
        onGenerateText(improved);
      }
    } catch (err) {
      setError(`Failed to improve text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedText, onGenerateText]);

  // テキスト拡張
  const handleExpand = useCallback(async () => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: LLM API呼び出しを実装
      const expanded = `[Expanded version of: ${selectedText}]`;
      
      setGeneratedContent(expanded);
      if (onGenerateText) {
        onGenerateText(expanded);
      }
    } catch (err) {
      setError(`Failed to expand text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedText, onGenerateText]);

  // 画像生成
  const handleGenerateImage = useCallback(async () => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: 画像生成API呼び出しを実装
      const imageUrl = `[Generated image URL for: ${selectedText}]`;
      
      if (onGenerateImage) {
        onGenerateImage(imageUrl);
      }
    } catch (err) {
      setError(`Failed to generate image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedText, onGenerateImage]);

  // 会話生成
  const handleGenerateDialogue = useCallback(async () => {
    if (!characterId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlClient.request(episodeMutations.generateCharacterDialogue, {
        characterId,
        sceneSetting: selectedText || undefined,
      });

      const dialogue = JSON.parse(result.generateCharacterDialogue);
      
      if (onGenerateDialogue) {
        onGenerateDialogue(dialogue);
      }
    } catch (err) {
      setError(`Failed to generate dialogue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [characterId, selectedText, onGenerateDialogue]);

  // コンテキスト読み込み
  const loadContextForGeneration = useCallback(async () => {
    try {
      // キャラクター情報を読み込む（ファイルシステム経由）
      if (characterId) {
        const { loadCharacterAction } = await import('@/app/(producer)/characters/actions');
        const result = await loadCharacterAction(characterId);
        if (result.ok) {
          return result.data;
        }
      }
      return {};
    } catch {
      return {};
    }
  }, [characterId]);

  const panelStyle: React.CSSProperties = cursorPosition
    ? {
        position: 'fixed',
        left: `${cursorPosition.x}px`,
        top: `${cursorPosition.y}px`,
        zIndex: 1000,
      }
    : {};

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]"
      style={panelStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">AI Assist</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {selectedText && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Selected:</div>
          <div className="text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
            {selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {selectedText && (
          <>
            <button
              onClick={handleGenerateNext}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Next'}
            </button>
            <button
              onClick={handleImprove}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Improving...' : 'Improve'}
            </button>
            <button
              onClick={handleExpand}
              disabled={loading}
              className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Expanding...' : 'Expand'}
            </button>
            <button
              onClick={handleGenerateImage}
              disabled={loading}
              className="w-full px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Image'}
            </button>
          </>
        )}

        {characterId && (
          <button
            onClick={handleGenerateDialogue}
            disabled={loading}
            className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Dialogue'}
          </button>
        )}
      </div>

      {generatedContent && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
          <div className="text-xs text-gray-600 mb-1">Generated:</div>
          <div className="max-h-32 overflow-y-auto">{generatedContent}</div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

