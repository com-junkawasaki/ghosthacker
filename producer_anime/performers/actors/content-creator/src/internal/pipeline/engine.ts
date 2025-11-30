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
      const storyResponse = await fetch('/api/grpc/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: storyData.title,
          content: storyData.content,
        }),
      });

      if (!storyResponse.ok) {
        throw new Error(`HTTP error! status: ${storyResponse.status}`);
      }
      const storyData_result = await storyResponse.json();

      if (!storyData_result.story) {
        throw new Error('Failed to create story');
      }

      context.storyId = storyData_result.story.id;
      context.currentStep = 'generate_script';
      context.updatedAt = new Date().toISOString();

      // Step 2: Scriptを生成（仮実装 - 実際のLLM処理は後で実装）
      const scriptText = `Script generated from story: ${storyData.title}\n\n${storyData.content.substring(0, 500)}...`;

      const scriptResponse = await fetch('/api/grpc/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script_text: scriptText,
          derived_from_story: context.storyId,
          status: 'draft',
        }),
      });

      if (!scriptResponse.ok) {
        throw new Error(`HTTP error! status: ${scriptResponse.status}`);
      }
      const scriptData = await scriptResponse.json();

      if (!scriptData.script) {
        throw new Error('Failed to create script');
      }

      context.scriptId = scriptData.script.id;
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

