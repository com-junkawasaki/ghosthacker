/**
 * Hume TTS API プロバイダー実装
 */

import type { AudioProvider, AudioGenerateRequest, AudioGenerateResponse } from './types';

export class HumeAudioProvider implements AudioProvider {
  readonly name = 'Hume TTS';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.HUME_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://api.hume.ai/v1';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: AudioGenerateRequest): Promise<AudioGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('Hume API key is not configured');
    }

    // 注意: Hume TTS APIの実際のエンドポイントとリクエスト形式は
    // 公式ドキュメントを確認して実装する必要があります
    // ここでは仮の実装です

    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        text: request.text,
        voice: request.voice ?? 'default',
        speed: request.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Hume TTS API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const audioUrl = data.audio_url ?? data.url ?? '';

    if (!audioUrl) {
      throw new Error('Hume TTS API did not return audio URL');
    }

    return { audioUrl };
  }
}

