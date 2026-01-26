/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/model-browser
 * 
 * Model browser utilities
 */
import { listFalModels } from './falClient';

export interface AIModel {
  id: string;
  provider: 'fal' | 'deepinfra';
  modelId: string;
  modelName: string;
  modelType: string;
  previewImageUrl?: string;
  description?: string;
}

export async function browseModels(provider?: 'fal' | 'deepinfra'): Promise<AIModel[]> {
  const models: AIModel[] = [];

  if (!provider || provider === 'fal') {
    try {
      const falModels = await listFalModels();
      models.push(
        ...falModels.map((model) => ({
          id: `fal-${model.id}`,
          provider: 'fal' as const,
          modelId: model.id,
          modelName: model.name,
          modelType: model.model_type || 'SDXL',
          previewImageUrl: model.preview_image_url,
          description: model.description,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch fal.ai models:', error);
    }
  }

  // DeepInfra models would be fetched here
  // For now, return empty array as DeepInfra doesn't have a public model list API

  return models;
}

export function filterModelsByType(models: AIModel[], modelType: string): AIModel[] {
  return models.filter((model) => model.modelType === modelType);
}

export function searchModels(models: AIModel[], query: string): AIModel[] {
  const lowerQuery = query.toLowerCase();
  return models.filter(
    (model) =>
      model.modelName.toLowerCase().includes(lowerQuery) ||
      model.modelId.toLowerCase().includes(lowerQuery) ||
      model.description?.toLowerCase().includes(lowerQuery)
  );
}

