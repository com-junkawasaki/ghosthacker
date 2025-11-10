/**
 * OpenAI (GPT-5) プロバイダー実装
 */

import type { LLMProvider, LLMGenerateRequest, LLMGenerateResponse } from './types';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';
  readonly type = 'openai' as const;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://api.openai.com/v1';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured');
    }

    const model = request.model ?? 'gpt-5'; // GPT-5が利用可能になったら使用

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content ?? '';

    return {
      text,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      } : undefined,
    };
  }
}

