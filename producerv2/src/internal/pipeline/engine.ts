/**
 * パイプライン実行エンジン
 */

import type { Story, Script, ImageAsset, AudioAsset, VideoAsset, YouTubePublication } from '../terminusdb/schema';
import {
  createStory,
  getStory,
  createScript,
  getScript,
  createImageAsset,
  getImageAsset,
  createAudioAsset,
  getAudioAsset,
  createVideoAsset,
  getVideoAsset,
  createYouTubePublication,
  updateEntity,
} from '../terminusdb/crud';
import { getDefaultLLMProvider, createLLMProvider } from '../providers/llm';
import { getImageProvider, getAudioProvider, getVideoProvider } from '../providers/media';
import { YouTubeClient } from '../providers/youtube/client';
import type { PipelineContext, PipelineConfig, PipelineStep } from './types';

/**
 * パイプライン実行エンジン
 */
export class PipelineEngine {
  private config: PipelineConfig;

  constructor(config: PipelineConfig = {}) {
    this.config = config;
  }

  /**
   * Storyを保存
   */
  async ingestStory(storyData: { title: string; content: string }): Promise<string> {
    const story = await createStory({
      '@type': 'ex:Story',
      'ex:title': storyData.title,
      'ex:content': storyData.content,
    });

    return story['@id'] ?? '';
  }

  /**
   * Scriptを生成
   */
  async generateScript(storyId: string): Promise<string> {
    const story = await getStory(storyId);
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    const llmProvider = this.config.llmProvider
      ? createLLMProvider(this.config.llmProvider, this.config.llmConfig)
      : getDefaultLLMProvider();

    const prompt = `以下のストーリーから、YouTube動画用のスクリプトを生成してください。\n\n${story['ex:content']}`;
    const systemPrompt = 'あなたは優れた動画コンテンツクリエイターです。視聴者を引き込む魅力的なスクリプトを作成してください。';

    const response = await llmProvider.generate({
      prompt,
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const script = await createScript({
      '@type': 'ex:Script',
      'ex:scriptText': response.text,
      'ex:derivedFromStory': storyId,
      'ex:status': 'completed',
    });

    return script['@id'] ?? '';
  }

  /**
   * 画像を生成
   */
  async generateImage(scriptId: string): Promise<string> {
    const script = await getScript(scriptId);
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }

    const imageProvider = getImageProvider(this.config.imageProviderConfig);
    const prompt = `YouTube動画のサムネイル画像: ${script['ex:scriptText'].substring(0, 200)}`;

    const response = await imageProvider.generate({
      prompt,
      size: '1024x1024',
      n: 1,
    });

    if (response.imageUrls.length === 0) {
      throw new Error('Failed to generate image');
    }

    const imageAsset = await createImageAsset({
      '@type': 'ex:ImageAsset',
      'ex:imageUrl': response.imageUrls[0] ?? '',
      'ex:derivedFromScript': scriptId,
      'ex:status': 'completed',
    });

    return imageAsset['@id'] ?? '';
  }

  /**
   * 音声を生成
   */
  async generateAudio(scriptId: string): Promise<string> {
    const script = await getScript(scriptId);
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }

    const audioProvider = getAudioProvider(this.config.audioProviderConfig);

    const response = await audioProvider.generate({
      text: script['ex:scriptText'],
      voice: 'default',
      speed: 1.0,
    });

    const audioAsset = await createAudioAsset({
      '@type': 'ex:AudioAsset',
      'ex:audioUrl': response.audioUrl,
      'ex:derivedFromScript': scriptId,
      'ex:status': 'completed',
    });

    return audioAsset['@id'] ?? '';
  }

  /**
   * 動画を合成
   */
  async composeVideo(imageAssetId: string, audioAssetId: string): Promise<string> {
    const imageAsset = await getImageAsset(imageAssetId);
    const audioAsset = await getAudioAsset(audioAssetId);

    if (!imageAsset || !audioAsset) {
      throw new Error('Image or audio asset not found');
    }

    const videoProvider = getVideoProvider(this.config.videoProviderConfig);

    const response = await videoProvider.generate({
      imageUrl: imageAsset['ex:imageUrl'],
      audioUrl: audioAsset['ex:audioUrl'],
    });

    // 動画生成が非同期の場合は、ステータスを確認
    if (response.status === 'pending' || response.status === 'processing') {
      // ポーリングして完了を待つ
      // 簡略化のため、ここでは即座に完了とみなします
    }

    const videoAsset = await createVideoAsset({
      '@type': 'ex:VideoAsset',
      'ex:videoUrl': response.videoUrl,
      'ex:composedFrom': [imageAssetId, audioAssetId],
      'ex:status': response.status === 'completed' ? 'completed' : 'pending',
    });

    return videoAsset['@id'] ?? '';
  }

  /**
   * YouTubeにアップロード
   */
  async uploadYouTube(videoAssetId: string, title: string, description?: string): Promise<string> {
    const videoAsset = await getVideoAsset(videoAssetId);
    if (!videoAsset) {
      throw new Error(`Video asset not found: ${videoAssetId}`);
    }

    const youtubeClient = new YouTubeClient(
      this.config.youtubeConfig?.clientId as string | undefined,
      this.config.youtubeConfig?.clientSecret as string | undefined,
      this.config.youtubeConfig?.redirectUri as string | undefined
    );

    if (this.config.youtubeConfig?.accessToken) {
      youtubeClient.setAccessToken(this.config.youtubeConfig.accessToken as string);
    }

    const response = await youtubeClient.uploadVideo({
      videoFile: videoAsset['ex:videoUrl'],
      title,
      description,
      privacyStatus: 'private',
    });

    const publication = await createYouTubePublication({
      '@type': 'ex:YouTubePublication',
      'ex:youtubeVideoId': response.videoId,
      'ex:youtubeUrl': response.videoUrl,
      'ex:publishedFrom': videoAssetId,
      'ex:status': response.status === 'uploaded' ? 'completed' : 'pending',
    });

    return publication['@id'] ?? '';
  }

  /**
   * パイプライン全体を実行
   */
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
      context.storyId = await this.ingestStory(storyData);
      context.currentStep = 'generate_script';
      context.updatedAt = new Date().toISOString();

      // Step 2: Scriptを生成
      context.scriptId = await this.generateScript(context.storyId);
      context.currentStep = 'generate_image';
      context.updatedAt = new Date().toISOString();

      // Step 3: ImageとAudioを並列生成
      const [imageAssetId, audioAssetId] = await Promise.all([
        this.generateImage(context.scriptId),
        this.generateAudio(context.scriptId),
      ]);

      context.imageAssetId = imageAssetId;
      context.audioAssetId = audioAssetId;
      context.currentStep = 'compose_video';
      context.updatedAt = new Date().toISOString();

      // Step 4: Videoを合成
      context.videoAssetId = await this.composeVideo(imageAssetId, audioAssetId);
      context.currentStep = 'upload_youtube';
      context.updatedAt = new Date().toISOString();

      // Step 5: YouTubeにアップロード
      if (youtubeTitle) {
        context.youtubePublicationId = await this.uploadYouTube(
          context.videoAssetId,
          youtubeTitle,
          youtubeDescription
        );
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

