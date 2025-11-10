/**
 * LLMプロバイダーの型定義
 */

/**
 * LLMプロバイダー種別
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

/**
 * LLM生成リクエスト
 */
export interface LLMGenerateRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * LLM生成レスポンス
 */
export interface LLMGenerateResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLMプロバイダーインターフェース
 */
export interface LLMProvider {
  /**
   * プロバイダー名
   */
  readonly name: string;

  /**
   * プロバイダー種別
   */
  readonly type: LLMProviderType;

  /**
   * テキスト生成
   */
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;

  /**
   * 利用可能かどうか
   */
  isAvailable(): boolean;
}

