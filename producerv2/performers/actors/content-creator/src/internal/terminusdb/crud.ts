/**
 * TerminusDB CRUD Operations
 * @see https://terminusdb.org/docs/how-to-query-with-graphql/
 * 
 * @context {
 *   "@id": "ex:TerminusDBCRUD",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentCRUD"
 * }
 */

import { getTerminusDBClient, getCurrentDatabase } from './client';
import { nanoid } from 'nanoid';

export interface Story {
  '@id': string;
  '@type': string;
  'ex:title': string;
  'ex:content': string;
  'ex:createdAt'?: string;
  'ex:updatedAt'?: string;
}

export interface Script {
  '@id': string;
  '@type': string;
  'ex:scriptText': string;
  'ex:derivedFromStory': string;
  'ex:status': string;
  'ex:createdAt'?: string;
  'ex:updatedAt'?: string;
}

/**
 * Storyドキュメントを作成
 * @context {
 *   "@id": "ex:createStory",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:StoryInput",
 *   "ex:produces": "ex:Story"
 * }
 */
export async function createStory(story: Omit<Story, '@id' | 'ex:createdAt' | 'ex:updatedAt'>): Promise<Story> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  const now = new Date().toISOString();
  
  const storyId = `Story_${nanoid()}`;
  const storyDoc: Story = {
    ...story,
    '@id': storyId,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  // TerminusDBにドキュメントを追加
  await client.addDocument(storyDoc, { graph_type: 'instance' }, db);
  
  return storyDoc;
}

/**
 * Storyドキュメントを取得
 * @context {
 *   "@id": "ex:getStory",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:StoryId",
 *   "ex:produces": "ex:Story"
 * }
 */
export async function getStory(storyId: string): Promise<Story | null> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  
  try {
    const doc = await client.getDocument({ id: storyId }, db);
    return doc as Story;
  } catch (error) {
    console.error('Error getting story:', error);
    return null;
  }
}

/**
 * すべてのStoryドキュメントを取得
 * @context {
 *   "@id": "ex:getAllStories",
 *   "@type": "ex:Activity",
 *   "ex:produces": "ex:StoryList"
 * }
 */
export async function getAllStories(): Promise<Story[]> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  
  try {
    // queryDocumentはクエリオブジェクトとパラメータを受け取る
    const docs = await client.queryDocument({ '@type': 'ex:Story' }, {}, db);
    return (Array.isArray(docs) ? docs : [docs]) as Story[];
  } catch (error) {
    console.error('Error getting stories:', error);
    return [];
  }
}

/**
 * Storyドキュメントを更新
 * @context {
 *   "@id": "ex:updateStory",
 *   "@type": "ex:Activity",
 *   "ex:consumes": ["ex:StoryId", "ex:StoryUpdate"],
 *   "ex:produces": "ex:Story"
 * }
 */
export async function updateStory(storyId: string, updates: Partial<Omit<Story, '@id' | '@type'>>): Promise<Story> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  const now = new Date().toISOString();
  
  // 既存のドキュメントを取得
  const existing = await getStory(storyId);
  if (!existing) {
    throw new Error(`Story ${storyId} not found`);
  }
  
  const updatedDoc = {
    ...existing,
    ...updates,
    'ex:updatedAt': now,
  };
  
  await client.updateDocument(updatedDoc, {}, db);
  
  const updated = await getStory(storyId);
  if (!updated) {
    throw new Error(`Story ${storyId} not found after update`);
  }
  
  return updated;
}

/**
 * Storyドキュメントを削除
 * @context {
 *   "@id": "ex:deleteStory",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:StoryId",
 *   "ex:produces": "ex:Deleted"
 * }
 */
export async function deleteStory(storyId: string): Promise<void> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  
  await client.deleteDocument({ id: storyId }, db);
}

/**
 * Scriptドキュメントを作成
 * @context {
 *   "@id": "ex:createScript",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:ScriptInput",
 *   "ex:produces": "ex:Script"
 * }
 */
export async function createScript(script: Omit<Script, '@id' | 'ex:createdAt' | 'ex:updatedAt'>): Promise<Script> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  const now = new Date().toISOString();
  
  const scriptId = `Script_${nanoid()}`;
  const scriptDoc: Script = {
    ...script,
    '@id': scriptId,
    'ex:createdAt': now,
    'ex:updatedAt': now,
  };

  await client.addDocument(scriptDoc, { graph_type: 'instance' }, db);
  
  return scriptDoc;
}

/**
 * Scriptドキュメントを取得
 * @context {
 *   "@id": "ex:getScript",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:ScriptId",
 *   "ex:produces": "ex:Script"
 * }
 */
export async function getScript(scriptId: string): Promise<Script | null> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  
  try {
    const doc = await client.getDocument({ id: scriptId }, db);
    return doc as Script;
  } catch (error) {
    console.error('Error getting script:', error);
    return null;
  }
}

