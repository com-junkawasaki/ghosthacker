/**
 * TerminusDB CRUD操作
 */

import { terminusDBClient } from './client';
import type {
  Story,
  Script,
  ImageAsset,
  AudioAsset,
  VideoAsset,
  YouTubePublication,
} from './schema';

/**
 * Storyを作成
 */
export async function createStory(story: Omit<Story, '@id' | 'ex:createdAt' | 'ex:updatedAt'>): Promise<Story> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const storyDoc: Story = {
    ...story,
    '@id': `Story_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  // TerminusDBにドキュメントを挿入
  await client.insertDocument(storyDoc, 'Story');
  
  return storyDoc;
}

/**
 * Storyを取得
 */
export async function getStory(id: string): Promise<Story | null> {
  const client = terminusDBClient.getClient();
  
  try {
    const doc = await client.getDocument(id);
    return doc as Story;
  } catch {
    return null;
  }
}

/**
 * すべてのStoryを取得
 */
export async function getAllStories(): Promise<Story[]> {
  const client = terminusDBClient.getClient();
  
  const query = {
    '@type': 'ex:Story',
  };
  
  const results = await client.queryDocument(query);
  return results as Story[];
}

/**
 * Scriptを作成
 */
export async function createScript(script: Omit<Script, '@id' | 'ex:createdAt' | 'ex:updatedAt'>): Promise<Script> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const scriptDoc: Script = {
    ...script,
    '@id': `Script_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.insertDocument(scriptDoc, 'Script');
  
  return scriptDoc;
}

/**
 * Scriptを取得
 */
export async function getScript(id: string): Promise<Script | null> {
  const client = terminusDBClient.getClient();
  
  try {
    const doc = await client.getDocument(id);
    return doc as Script;
  } catch {
    return null;
  }
}

/**
 * ImageAssetを作成
 */
export async function createImageAsset(
  asset: Omit<ImageAsset, '@id' | 'ex:createdAt' | 'ex:updatedAt'>
): Promise<ImageAsset> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const assetDoc: ImageAsset = {
    ...asset,
    '@id': `ImageAsset_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.insertDocument(assetDoc, 'ImageAsset');
  
  return assetDoc;
}

/**
 * AudioAssetを作成
 */
export async function createAudioAsset(
  asset: Omit<AudioAsset, '@id' | 'ex:createdAt' | 'ex:updatedAt'>
): Promise<AudioAsset> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const assetDoc: AudioAsset = {
    ...asset,
    '@id': `AudioAsset_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.insertDocument(assetDoc, 'AudioAsset');
  
  return assetDoc;
}

/**
 * VideoAssetを作成
 */
export async function createVideoAsset(
  asset: Omit<VideoAsset, '@id' | 'ex:createdAt' | 'ex:updatedAt'>
): Promise<VideoAsset> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const assetDoc: VideoAsset = {
    ...asset,
    '@id': `VideoAsset_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.insertDocument(assetDoc, 'VideoAsset');
  
  return assetDoc;
}

/**
 * YouTubePublicationを作成
 */
export async function createYouTubePublication(
  publication: Omit<YouTubePublication, '@id' | 'ex:createdAt' | 'ex:updatedAt'>
): Promise<YouTubePublication> {
  const client = terminusDBClient.getClient();
  const now = new Date().toISOString();
  
  const pubDoc: YouTubePublication = {
    ...publication,
    '@id': `YouTubePublication_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.insertDocument(pubDoc, 'YouTubePublication');
  
  return pubDoc;
}

/**
 * ImageAssetを取得
 */
export async function getImageAsset(id: string): Promise<ImageAsset | null> {
  const client = terminusDBClient.getClient();
  
  try {
    const doc = await client.getDocument(id);
    return doc as ImageAsset;
  } catch {
    return null;
  }
}

/**
 * AudioAssetを取得
 */
export async function getAudioAsset(id: string): Promise<AudioAsset | null> {
  const client = terminusDBClient.getClient();
  
  try {
    const doc = await client.getDocument(id);
    return doc as AudioAsset;
  } catch {
    return null;
  }
}

/**
 * VideoAssetを取得
 */
export async function getVideoAsset(id: string): Promise<VideoAsset | null> {
  const client = terminusDBClient.getClient();
  
  try {
    const doc = await client.getDocument(id);
    return doc as VideoAsset;
  } catch {
    return null;
  }
}

/**
 * エンティティを更新
 */
export async function updateEntity<T extends { '@id'?: string; 'ex:updatedAt': string }>(
  id: string,
  updates: Partial<T>
): Promise<T> {
  const client = terminusDBClient.getClient();
  
  const updated = {
    ...updates,
    'ex:updatedAt': new Date().toISOString(),
  };

  await client.updateDocument(id, updated);
  
  const doc = await client.getDocument(id);
  return doc as T;
}

