/**
 * Ollama プロバイダー実装
 */

import type { LLMProvider, LLMGenerateRequest, LLMGenerateResponse } from './types';

export class OllamaProvider implements LLMProvider {
  readonly name = 'Ollama';
  readonly type = 'ollama' as const;
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.defaultModel = defaultModel ?? 'llama2';
  }

  isAvailable(): boolean {
    // OllamaはAPIキー不要なので、常に利用可能とみなす
    // 実際の接続確認はgenerate時にエラーハンドリングで行う
    return true;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const model = request.model ?? this.defaultModel;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: request.systemPrompt
          ? `${request.systemPrompt}\n\n${request.prompt}`
          : request.prompt,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 2000,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    const text = data.response ?? '';

    return {
      text,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
    };
  }
}

