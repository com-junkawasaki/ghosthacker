/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/image-generation-dialog
 * 
 * Image generation dialog component
 */
'use client';

import { useState } from 'react';
import { generateImage, ImageGenerationOptions, ImageGenerationResponse } from '@/lib/ai/imageGenerator';
import { AIModel } from '@/lib/ai/modelBrowser';
import { ModelSelectorDialog } from './ModelSelectorDialog';

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string, imageBase64?: string) => void;
  initialPrompt?: string;
}

export function ImageGenerationDialog({
  isOpen,
  onClose,
  onImageGenerated,
  initialPrompt = '',
}: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<Array<{ url?: string; base64?: string }>>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const handleGenerate = async () => {
    if (!selectedModel || !prompt.trim()) {
      setError('プロンプトとモデルを選択してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreviewImages([]);

    try {
      const options: ImageGenerationOptions = {
        provider: selectedModel.provider,
        prompt,
        negativePrompt: negativePrompt || undefined,
        modelId: selectedModel.modelId,
        width: 1024,
        height: 1024,
        numImages: 1,
      };

      const result: ImageGenerationResponse = await generateImage(options);
      setPreviewImages(result.images);

      if (result.images.length > 0) {
        const firstImage = result.images[0];
        if (firstImage.url) {
          onImageGenerated(firstImage.url, firstImage.base64);
        } else if (firstImage.base64) {
          onImageGenerated('', firstImage.base64);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">画像生成</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">プロンプト</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 p-2 border border-gray-300 rounded text-sm resize-none"
                placeholder="画像の説明を入力..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ネガティブプロンプト</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full h-24 p-2 border border-gray-300 rounded text-sm resize-none"
                placeholder="避けたい要素を入力..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">モデル</label>
              <button
                onClick={() => setShowModelSelector(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded text-left hover:bg-gray-50"
              >
                {selectedModel ? (
                  <div>
                    <div className="font-medium">{selectedModel.modelName}</div>
                    <div className="text-xs text-gray-500">{selectedModel.provider} / {selectedModel.modelId}</div>
                  </div>
                ) : (
                  <span className="text-gray-500">モデルを選択...</span>
                )}
              </button>
            </div>

            {previewImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">生成された画像</label>
                <div className="grid grid-cols-2 gap-2">
                  {previewImages.map((img, idx) => (
                    <div key={idx} className="border border-gray-300 rounded overflow-hidden">
                      {img.url ? (
                        <img src={img.url} alt={`Generated ${idx + 1}`} className="w-full h-auto" />
                      ) : img.base64 ? (
                        <img src={img.base64} alt={`Generated ${idx + 1}`} className="w-full h-auto" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isGenerating}
              >
                キャンセル
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedModel || !prompt.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ModelSelectorDialog
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        onSelect={setSelectedModel}
      />
    </>
  );
}

