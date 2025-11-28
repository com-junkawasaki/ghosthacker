/**
 * GraphQL Client Usage Examples
 * 
 * このファイルは使用例を示すためのものです。
 * 実際のコードでは、これらの関数を適切な場所で使用してください。
 */

import { graphqlRequest } from './client';
// コード生成後、以下のインポートが利用可能になります:
// import {
//   GetStoriesDocument,
//   GetStoryDocument,
//   CreateStoryDocument,
//   UpdateStoryDocument,
//   DeleteStoryDocument,
//   GetScriptDocument,
//   CreateScriptDocument,
//   UpdateScriptDocument,
//   DeleteScriptDocument,
// } from '@/generated/graphql';

/**
 * すべてのStoryを取得する例
 */
export async function getAllStories() {
  // コード生成後:
  // const result = await graphqlRequest(GetStoriesDocument);
  // return result.stories;
}

/**
 * 特定のStoryを取得する例
 */
export async function getStoryById(id: string) {
  // コード生成後:
  // const result = await graphqlRequest(GetStoryDocument, {
  //   variables: { id },
  // });
  // return result.story;
}

/**
 * Storyを作成する例
 */
export async function createStory(title: string, content: string) {
  // コード生成後:
  // const result = await graphqlRequest(CreateStoryDocument, {
  //   variables: { title, content },
  // });
  // return result.createStory;
}

/**
 * Storyを更新する例
 */
export async function updateStory(
  id: string,
  title?: string,
  content?: string
) {
  // コード生成後:
  // const result = await graphqlRequest(UpdateStoryDocument, {
  //   variables: { id, title, content },
  // });
  // return result.updateStory;
}

/**
 * Storyを削除する例
 */
export async function deleteStory(id: string) {
  // コード生成後:
  // const result = await graphqlRequest(DeleteStoryDocument, {
  //   variables: { id },
  // });
  // return result.deleteStory;
}

