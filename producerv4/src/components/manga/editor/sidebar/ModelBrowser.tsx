/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-browser
 * 
 * Model browser component for browsing and selecting AI models
 */
'use client';

import { useEffect, useState } from 'react';
import { ModelCard } from './ModelCard';
import { ModelSearch } from './ModelSearch';
import { browseModels, AIModel } from '@/lib/ai/modelBrowser';

interface ModelBrowserProps {
  provider?: 'fal' | 'deepinfra';
  onModelSelect?: (model: AIModel) => void;
}

export function ModelBrowser({ provider, onModelSelect }: ModelBrowserProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<AIModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const fetchedModels = await browseModels(provider);
        setModels(fetchedModels);
        setFilteredModels(fetchedModels);
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [provider]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = models.filter(
        (model) =>
          model.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.modelId.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredModels(filtered);
    } else {
      setFilteredModels(models);
    }
  }, [searchQuery, models]);

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">モデルを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <ModelSearch value={searchQuery} onChange={setSearchQuery} />
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            onClick={() => onModelSelect?.(model)}
          />
        ))}
        {filteredModels.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-8">
            モデルが見つかりませんでした
          </p>
        )}
      </div>
    </div>
  );
}

