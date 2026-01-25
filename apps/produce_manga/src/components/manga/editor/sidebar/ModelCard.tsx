/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-card
 * 
 * Model card component
 */
'use client';

import { Badge } from '@/components/shared/ui/Badge';
import { SDXLBadge } from './SDXLBadge';
import { AIModel } from '@/lib/ai/modelBrowser';

interface ModelCardProps {
  model: AIModel;
  onClick?: () => void;
}

export function ModelCard({ model, onClick }: ModelCardProps) {
  return (
    <div
      onClick={onClick}
      className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-primary-500 hover:shadow-md transition-all"
    >
      {model.previewImageUrl && (
        <div className="w-full h-32 mb-2 rounded overflow-hidden bg-gray-100">
          <img
            src={model.previewImageUrl}
            alt={model.modelName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-sm text-gray-900">{model.modelName}</h4>
        {model.modelType === 'SDXL' && <SDXLBadge />}
      </div>
      {model.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{model.description}</p>
      )}
      <div className="flex items-center gap-2">
        <Badge variant="default">{model.provider}</Badge>
        <span className="text-xs text-gray-500">{model.modelId}</span>
      </div>
    </div>
  );
}

