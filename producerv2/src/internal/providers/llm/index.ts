/**
 * LLMプロバイダー管理
 */

import type { LLMProvider, LLMProviderType } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';

/**
 * LLMプロバイダーファクトリー
 */
export function createLLMProvider(type: LLMProviderType, config?: Record<string, unknown>): LLMProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(
        config?.apiKey as string | undefined,
        config?.baseUrl as string | undefined
      );
    case 'anthropic':
      return new AnthropicProvider(
        config?.apiKey as string | undefined,
        config?.baseUrl as string | undefined
      );
    case 'ollama':
      return new OllamaProvider(
        config?.baseUrl as string | undefined,
        config?.defaultModel as string | undefined
      );
    default:
      throw new Error(`Unknown LLM provider type: ${type}`);
  }
}

/**
 * デフォルトのLLMプロバイダーを取得
 */
export function getDefaultLLMProvider(): LLMProvider {
  // 環境変数から優先順位で選択
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  // デフォルトはOllama（ローカル開発用）
  return new OllamaProvider();
}

