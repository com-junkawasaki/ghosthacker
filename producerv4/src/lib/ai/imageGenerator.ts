/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/image-generator
 * 
 * Unified image generation interface for multiple providers
 */
import { generateImageWithFal, FalImageGenerationOptions, FalImageGenerationResponse } from './falClient';
import { generateImageWithDeepInfra, DeepInfraImageGenerationOptions, DeepInfraImageGenerationResponse } from './deepinfraClient';

export type ImageGeneratorProvider = 'fal' | 'deepinfra' | 'openai';

export interface ImageGenerationOptions {
  provider: ImageGeneratorProvider;
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  width?: number;
  height?: number;
  // Provider-specific options
  numImages?: number; // fal.ai
  numInferenceSteps?: number; // DeepInfra
  guidanceScale?: number; // DeepInfra
}

export interface ImageGenerationResponse {
  images: Array<{
    url?: string;
    base64?: string;
    width: number;
    height: number;
  }>;
  provider: ImageGeneratorProvider;
  modelId: string;
}

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public provider: ImageGeneratorProvider,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResponse> {
  try {
    switch (options.provider) {
      case 'fal': {
        const falOptions: FalImageGenerationOptions = {
          prompt: options.prompt,
          negativePrompt: options.negativePrompt,
          modelId: options.modelId,
          width: options.width,
          height: options.height,
          numImages: options.numImages,
        };
        const result: FalImageGenerationResponse = await generateImageWithFal(falOptions);
        return {
          images: result.images.map((img) => ({
            url: img.url,
            width: img.width,
            height: img.height,
          })),
          provider: 'fal',
          modelId: options.modelId,
        };
      }
      case 'deepinfra': {
        const deepinfraOptions: DeepInfraImageGenerationOptions = {
          prompt: options.prompt,
          negativePrompt: options.negativePrompt,
          modelId: options.modelId,
          width: options.width,
          height: options.height,
          numInferenceSteps: options.numInferenceSteps,
          guidanceScale: options.guidanceScale,
        };
        const result: DeepInfraImageGenerationResponse = await generateImageWithDeepInfra(deepinfraOptions);
        return {
          images: result.images.map((base64) => ({
            base64: `data:image/png;base64,${base64}`,
            width: options.width || 1024,
            height: options.height || 1024,
          })),
          provider: 'deepinfra',
          modelId: options.modelId,
        };
      }
      case 'openai':
        // TODO: Implement OpenAI DALL-E integration
        throw new ImageGenerationError('OpenAI provider not yet implemented', 'openai');
      default:
        const provider = (options as { provider?: ImageGeneratorProvider }).provider || 'fal';
        throw new ImageGenerationError(`Unsupported provider: ${provider}`, provider);
    }
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw error;
    }
    throw new ImageGenerationError(
      `Image generation failed: ${error instanceof Error ? error.message : String(error)}`,
      options.provider,
      error
    );
  }
}

