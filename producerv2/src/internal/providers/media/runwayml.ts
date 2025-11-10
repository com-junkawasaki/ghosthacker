/**
 * RunwayML API プロバイダー実装
 */

import type { VideoProvider, VideoGenerateRequest, VideoGenerateResponse } from './types';

export class RunwayMLProvider implements VideoProvider {
  readonly name = 'RunwayML';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.RUNWAYML_API_KEY ?? '';
    this.baseUrl = baseUrl ?? 'https://api.runwayml.com/v1';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: VideoGenerateRequest): Promise<VideoGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('RunwayML API key is not configured');
    }

    // 注意: RunwayML APIの実際のエンドポイントとリクエスト形式は
    // 公式ドキュメントを確認して実装する必要があります
    // ここでは仮の実装です

    const response = await fetch(`${this.baseUrl}/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...(request.imageUrl && { image_url: request.imageUrl }),
        ...(request.audioUrl && { audio_url: request.audioUrl }),
        ...(request.prompt && { prompt: request.prompt }),
        duration: request.duration ?? 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`RunwayML API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const videoId = data.video_id ?? data.id ?? '';
    const videoUrl = data.video_url ?? data.url ?? '';
    const status = (data.status ?? 'pending') as VideoGenerateResponse['status'];

    return {
      videoUrl: videoUrl || `pending:${videoId}`,
      status,
    };
  }

  async getStatus(videoId: string): Promise<VideoGenerateResponse> {
    if (!this.isAvailable()) {
      throw new Error('RunwayML API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/video/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`RunwayML API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const videoUrl = data.video_url ?? data.url ?? '';
    const status = (data.status ?? 'pending') as VideoGenerateResponse['status'];

    return {
      videoUrl,
      status,
    };
  }
}

