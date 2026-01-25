/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/image-generator-types
 * 
 * 画像生成機能の型定義
 */

/**
 * APIプロバイダータイプ
 */
export type ImageGeneratorProvider = 'openai' | 'higgsfield';

/**
 * OpenAI画像生成オプション
 */
export interface OpenAIImageOptions {
  provider: 'openai';
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  n?: number; // 生成する画像数（1-10）
}

/**
 * Higgsfield画像生成オプション
 */
export interface HiggsfieldImageOptions {
  provider: 'higgsfield';
  prompt: string;
  // Higgsfield固有のオプション（APIドキュメントに基づいて追加）
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
}

/**
 * 画像生成オプションのユニオン型
 */
export type ImageGenerationOptions = OpenAIImageOptions | HiggsfieldImageOptions;

/**
 * 画像生成レスポンス
 */
export interface ImageGenerationResponse {
  success: boolean;
  imageBase64?: string; // Base64エンコードされた画像データ
  imageUrl?: string; // 画像URL（Base64変換前）
  error?: string;
  provider: ImageGeneratorProvider;
}

/**
 * 画像生成エラー
 */
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public provider: ImageGeneratorProvider,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

