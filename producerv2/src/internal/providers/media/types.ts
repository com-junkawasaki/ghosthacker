/**
 * メディアプロバイダーの型定義
 */

/**
 * 画像生成リクエスト
 */
export interface ImageGenerateRequest {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024';
  n?: number;
}

/**
 * 画像生成レスポンス
 */
export interface ImageGenerateResponse {
  imageUrls: string[];
}

/**
 * 音声生成リクエスト
 */
export interface AudioGenerateRequest {
  text: string;
  voice?: string;
  speed?: number;
}

/**
 * 音声生成レスポンス
 */
export interface AudioGenerateResponse {
  audioUrl: string;
}

/**
 * 動画生成リクエスト
 */
export interface VideoGenerateRequest {
  imageUrl?: string;
  audioUrl?: string;
  prompt?: string;
  duration?: number;
}

/**
 * 動画生成レスポンス
 */
export interface VideoGenerateResponse {
  videoUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * 画像生成プロバイダーインターフェース
 */
export interface ImageProvider {
  readonly name: string;
  generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse>;
  isAvailable(): boolean;
}

/**
 * 音声生成プロバイダーインターフェース
 */
export interface AudioProvider {
  readonly name: string;
  generate(request: AudioGenerateRequest): Promise<AudioGenerateResponse>;
  isAvailable(): boolean;
}

/**
 * 動画生成プロバイダーインターフェース
 */
export interface VideoProvider {
  readonly name: string;
  generate(request: VideoGenerateRequest): Promise<VideoGenerateResponse>;
  isAvailable(): boolean;
  getStatus(videoId: string): Promise<VideoGenerateResponse>;
}

