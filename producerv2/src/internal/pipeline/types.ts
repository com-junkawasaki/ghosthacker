/**
 * パイプライン実行の型定義
 */

/**
 * パイプライン実行状態
 */
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * パイプライン実行コンテキスト
 */
export interface PipelineContext {
  storyId: string;
  scriptId?: string;
  imageAssetId?: string;
  audioAssetId?: string;
  videoAssetId?: string;
  youtubePublicationId?: string;
  status: PipelineStatus;
  currentStep: PipelineStep;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * パイプラインステップ
 */
export type PipelineStep =
  | 'ingest_story'
  | 'generate_script'
  | 'generate_image'
  | 'generate_audio'
  | 'compose_video'
  | 'upload_youtube';

/**
 * パイプライン設定
 */
export interface PipelineConfig {
  llmProvider?: 'openai' | 'anthropic' | 'ollama';
  llmConfig?: Record<string, unknown>;
  imageProviderConfig?: Record<string, unknown>;
  audioProviderConfig?: Record<string, unknown>;
  videoProviderConfig?: Record<string, unknown>;
  youtubeConfig?: Record<string, unknown>;
}

