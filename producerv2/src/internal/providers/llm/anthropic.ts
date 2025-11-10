/**
 * Anthropic (Claude) プロバイダー実装
 */

import type { LLMProvider, LLMGenerateRequest, LLMGenerateResponse } from './types';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'Anthropic';
  readonly type = 'anthropic' as const;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://api.anthropic.com/v1';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key is not configured');
    }

    const model = request.model ?? 'claude-3-5-sonnet-20241022';

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: request.prompt },
        ],
        ...(request.systemPrompt && { system: request.systemPrompt }),
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text ?? '';

    return {
      text,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens ?? 0,
        completionTokens: data.usage.output_tokens ?? 0,
        totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
      } : undefined,
    };
  }
}

