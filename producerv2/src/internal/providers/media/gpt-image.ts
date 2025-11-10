/**
 * GPT Image API プロバイダー実装
 */

import type { ImageProvider, ImageGenerateRequest, ImageGenerateResponse } from './types';

export class GPTImageProvider implements ImageProvider {
  readonly name = 'GPT Image';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://api.openai.com/v1';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        n: request.n ?? 1,
        size: request.size ?? '1024x1024',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`GPT Image API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const imageUrls = data.data?.map((item: { url?: string }) => item.url).filter(Boolean) ?? [];

    return { imageUrls };
  }
}

