/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-selector-dialog
 * 
 * Model selector dialog component
 */
'use client';

import { ModelBrowser } from '../sidebar/ModelBrowser';
import { AIModel } from '@/lib/ai/modelBrowser';

interface ModelSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: AIModel) => void;
  provider?: 'fal' | 'deepinfra';
}

export function ModelSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  provider,
}: ModelSelectorDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">モデルを選択</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ModelBrowser provider={provider} onModelSelect={(model) => {
            onSelect(model);
            onClose();
          }} />
        </div>
      </div>
    </div>
  );
}

