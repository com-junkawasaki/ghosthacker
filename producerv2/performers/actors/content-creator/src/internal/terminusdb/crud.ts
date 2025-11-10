/**
 * TerminusDB CRUD Operations
 */

import { getTerminusDBClient } from './client';

export interface Story {
  '@id': string;
  '@type': string;
  'ex:title': string;
  'ex:content': string;
  'ex:createdAt'?: string;
  'ex:updatedAt'?: string;
}

export async function createStory(story: Omit<Story, '@id' | 'ex:createdAt' | 'ex:updatedAt'>): Promise<Story> {
  const client = getTerminusDBClient();
  const now = new Date().toISOString();
  
  const storyDoc: Story = {
    ...story,
    '@id': `Story_${Date.now()}`,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  // TerminusDBにドキュメントを挿入
  // ここでは基本的な実装のみ
  console.log('Creating story:', storyDoc);
  
  return storyDoc;
}

