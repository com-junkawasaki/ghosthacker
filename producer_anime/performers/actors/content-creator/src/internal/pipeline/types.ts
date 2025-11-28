/**
 * Pipeline Types
 */

export interface PipelineConfig {
  llmProvider?: 'openai' | 'anthropic' | 'ollama';
  imageProvider?: 'gpt';
  audioProvider?: 'hume';
  videoProvider?: 'runwayml';
}

export interface PipelineContext {
  storyId: string;
  scriptId?: string;
  imageAssetId?: string;
  audioAssetId?: string;
  videoAssetId?: string;
  youtubePublicationId?: string;
  status: 'running' | 'completed' | 'failed';
  currentStep: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

