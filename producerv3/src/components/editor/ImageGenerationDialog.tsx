/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/image-generation-dialog
 * 
 * 画像生成ダイアログコンポーネント
 */
'use client';

import { useState } from 'react';
import { generateImage } from '@/lib/ai/imageGenerator';
import type {
  ImageGenerationOptions,
  ImageGeneratorProvider,
  OpenAIImageOptions,
  HiggsfieldImageOptions,
} from '@/types/imageGenerator';

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (imageBase64: string) => void;
}

export function ImageGenerationDialog({
  isOpen,
  onClose,
  onInsertImage,
}: ImageGenerationDialogProps) {
  const [provider, setProvider] = useState<ImageGeneratorProvider>('openai');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // OpenAI固有のオプション
  const [openAIModel, setOpenAIModel] = useState<'dall-e-2' | 'dall-e-3'>('dall-e-3');
  const [openAISize, setOpenAISize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [openAIStyle, setOpenAIStyle] = useState<'vivid' | 'natural'>('vivid');
  const [openAIQuality, setOpenAIQuality] = useState<'standard' | 'hd'>('standard');

  // Higgsfield固有のオプション
  const [higgsfieldWidth, setHiggsfieldWidth] = useState(1024);
  const [higgsfieldHeight, setHiggsfieldHeight] = useState(1024);
  const [higgsfieldSteps, setHiggsfieldSteps] = useState(20);
  const [higgsfieldGuidanceScale, setHiggsfieldGuidanceScale] = useState(7.5);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewImage(null);

    try {
      let options: ImageGenerationOptions;

      if (provider === 'openai') {
        options = {
          provider: 'openai',
          prompt,
          model: openAIModel,
          size: openAIModel === 'dall-e-3' ? openAISize : '1024x1024',
          style: openAIModel === 'dall-e-3' ? openAIStyle : 'vivid',
          quality: openAIModel === 'dall-e-3' ? openAIQuality : 'standard',
        } as OpenAIImageOptions;
      } else {
        options = {
          provider: 'higgsfield',
          prompt,
          width: higgsfieldWidth,
          height: higgsfieldHeight,
          steps: higgsfieldSteps,
          guidance_scale: higgsfieldGuidanceScale,
        } as HiggsfieldImageOptions;
      }

      const result = await generateImage(options);

      if (result.success && result.imageBase64) {
        setPreviewImage(result.imageBase64);
      } else {
        setError(result.error || '画像生成に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (previewImage) {
      onInsertImage(previewImage);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setError(null);
    setPreviewImage(null);
    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">画像生成</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* プロバイダー選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APIプロバイダー
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProvider('openai')}
                className={`px-4 py-2 rounded ${
                  provider === 'openai'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                OpenAI (DALL-E)
              </button>
              <button
                onClick={() => setProvider('higgsfield')}
                className={`px-4 py-2 rounded ${
                  provider === 'higgsfield'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Higgsfield
              </button>
            </div>
          </div>

          {/* プロンプト入力 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プロンプト
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="生成したい画像の説明を入力してください..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              rows={4}
              disabled={isGenerating}
            />
          </div>

          {/* OpenAI固有のオプション */}
          {provider === 'openai' && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  モデル
                </label>
                <select
                  value={openAIModel}
                  onChange={(e) => setOpenAIModel(e.target.value as 'dall-e-2' | 'dall-e-3')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isGenerating}
                >
                  <option value="dall-e-3">DALL-E 3</option>
                  <option value="dall-e-2">DALL-E 2</option>
                </select>
              </div>

              {openAIModel === 'dall-e-3' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      サイズ
                    </label>
                    <select
                      value={openAISize}
                      onChange={(e) =>
                        setOpenAISize(e.target.value as '1024x1024' | '1792x1024' | '1024x1792')
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={isGenerating}
                    >
                      <option value="1024x1024">1024x1024 (正方形)</option>
                      <option value="1792x1024">1792x1024 (横長)</option>
                      <option value="1024x1792">1024x1792 (縦長)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      スタイル
                    </label>
                    <select
                      value={openAIStyle}
                      onChange={(e) => setOpenAIStyle(e.target.value as 'vivid' | 'natural')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={isGenerating}
                    >
                      <option value="vivid">Vivid (鮮やか)</option>
                      <option value="natural">Natural (自然)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      品質
                    </label>
                    <select
                      value={openAIQuality}
                      onChange={(e) => setOpenAIQuality(e.target.value as 'standard' | 'hd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={isGenerating}
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">HD</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Higgsfield固有のオプション */}
          {provider === 'higgsfield' && (
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    幅
                  </label>
                  <input
                    type="number"
                    value={higgsfieldWidth}
                    onChange={(e) => setHiggsfieldWidth(Number.parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min={256}
                    max={2048}
                    step={64}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    高さ
                  </label>
                  <input
                    type="number"
                    value={higgsfieldHeight}
                    onChange={(e) => setHiggsfieldHeight(Number.parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min={256}
                    max={2048}
                    step={64}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Steps
                </label>
                <input
                  type="number"
                  value={higgsfieldSteps}
                  onChange={(e) => setHiggsfieldSteps(Number.parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={1}
                  max={50}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guidance Scale
                </label>
                <input
                  type="number"
                  value={higgsfieldGuidanceScale}
                  onChange={(e) => setHiggsfieldGuidanceScale(Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={1}
                  max={20}
                  step={0.5}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* プレビュー */}
          {previewImage && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プレビュー
              </label>
              <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                <img
                  src={previewImage}
                  alt="Generated preview"
                  className="max-w-full h-auto rounded"
                />
              </div>
            </div>
          )}

          {/* ローディング表示 */}
          {isGenerating && (
            <div className="mb-4 text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">画像を生成中...</p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            disabled={isGenerating}
          >
            キャンセル
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? '生成中...' : '生成'}
          </button>
          {previewImage && (
            <button
              onClick={handleInsert}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              挿入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

