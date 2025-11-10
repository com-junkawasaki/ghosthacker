/**
 * メディアプロバイダー管理
 */

import type { ImageProvider, AudioProvider, VideoProvider } from './types';
import { GPTImageProvider } from './gpt-image';
import { HumeAudioProvider } from './hume';
import { RunwayMLProvider } from './runwayml';

/**
 * 画像生成プロバイダーを取得
 */
export function getImageProvider(config?: Record<string, unknown>): ImageProvider {
  return new GPTImageProvider(
    config?.apiKey as string | undefined,
    config?.baseUrl as string | undefined
  );
}

/**
 * 音声生成プロバイダーを取得
 */
export function getAudioProvider(config?: Record<string, unknown>): AudioProvider {
  return new HumeAudioProvider(
    config?.apiKey as string | undefined,
    config?.baseUrl as string | undefined
  );
}

/**
 * 動画生成プロバイダーを取得
 */
export function getVideoProvider(config?: Record<string, unknown>): VideoProvider {
  return new RunwayMLProvider(
    config?.apiKey as string | undefined,
    config?.baseUrl as string | undefined
  );
}

