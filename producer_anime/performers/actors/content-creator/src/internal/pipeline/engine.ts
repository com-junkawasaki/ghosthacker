/**
 * Pipeline Engine
 * 
 * @context {
 *   "@id": "ex:PipelineEngine",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:PipelineExecution"
 * }
 */

import type { PipelineConfig, PipelineContext } from './types';
import { graphqlRequest } from '../graphql/client';
import { CreateStoryDocument, CreateScriptDocument } from '@/generated/graphql';

export class PipelineEngine {
  private config: PipelineConfig;

  constructor(config?: PipelineConfig) {
    this.config = config || {};
  }

  async executePipeline(
    storyData: { title: string; content: string },
    youtubeTitle?: string,
    youtubeDescription?: string
  ): Promise<PipelineContext> {
    const context: PipelineContext = {
      storyId: '',
      status: 'running',
      currentStep: 'ingest_story',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Step 1: Storyを保存
      const storyResult = await graphqlRequest(CreateStoryDocument, {
        variables: {
          title: storyData.title,
          content: storyData.content,
        },
      });

      if (!storyResult.createStory) {
        throw new Error('Failed to create story');
      }

      context.storyId = storyResult.createStory.id;
      context.currentStep = 'generate_script';
      context.updatedAt = new Date().toISOString();

      // Step 2: Scriptを生成（仮実装 - 実際のLLM処理は後で実装）
      const scriptText = `Script generated from story: ${storyData.title}\n\n${storyData.content.substring(0, 500)}...`;

      const scriptResult = await graphqlRequest(CreateScriptDocument, {
        variables: {
          scriptText,
          derivedFromStory: context.storyId,
          status: 'draft',
        },
      });

      if (!scriptResult.createScript) {
        throw new Error('Failed to create script');
      }

      context.scriptId = scriptResult.createScript.id;
      context.currentStep = 'generate_image';
      context.updatedAt = new Date().toISOString();

      // Step 3: ImageとAudioを並列生成（仮実装）
      context.imageAssetId = `image_${Date.now()}`;
      context.audioAssetId = `audio_${Date.now()}`;
      context.currentStep = 'compose_video';
      context.updatedAt = new Date().toISOString();

      // Step 4: Videoを合成（仮実装）
      context.videoAssetId = `video_${Date.now()}`;
      context.currentStep = 'upload_youtube';
      context.updatedAt = new Date().toISOString();

      // Step 5: YouTubeにアップロード（仮実装）
      if (youtubeTitle) {
        context.youtubePublicationId = `youtube_${Date.now()}`;
      }

      context.status = 'completed';
      context.currentStep = 'upload_youtube';
      context.updatedAt = new Date().toISOString();

      return context;
    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : 'Unknown error';
      context.updatedAt = new Date().toISOString();
      throw error;
    }
  }
}

