/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-image
 * 
 * 画像生成APIクライアント
 * OpenAI DALL-EとHiggsfieldのAPIを統合
 */

import type {
  ImageGenerationOptions,
  ImageGenerationResponse,
  OpenAIImageOptions,
  HiggsfieldImageOptions,
  ImageGeneratorProvider,
} from '@/types/imageGenerator';
import { ImageGenerationError } from '@/types/imageGenerator';

/**
 * URLからBase64に変換するヘルパー関数
 */
async function urlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new ImageGenerationError(
      `Failed to convert URL to Base64: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'openai',
      error
    );
  }
}

/**
 * OpenAI DALL-E APIで画像を生成
 */
async function generateOpenAIImage(
  options: OpenAIImageOptions
): Promise<ImageGenerationResponse> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new ImageGenerationError(
      'OpenAI API key is not configured',
      'openai'
    );
  }

  const {
    prompt,
    model = 'dall-e-3',
    size = '1024x1024',
    style = 'vivid',
    quality = 'standard',
    n = 1,
  } = options;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: model === 'dall-e-3' ? size : undefined,
        style: model === 'dall-e-3' ? style : undefined,
        quality: model === 'dall-e-3' ? quality : undefined,
        n: model === 'dall-e-2' ? n : undefined,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ImageGenerationError(
        errorData.error?.message || `OpenAI API error: ${response.statusText}`,
        'openai',
        errorData
      );
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new ImageGenerationError(
        'No image URL returned from OpenAI API',
        'openai'
      );
    }

    // URLをBase64に変換
    const imageBase64 = await urlToBase64(imageUrl);

    return {
      success: true,
      imageBase64,
      imageUrl,
      provider: 'openai',
    };
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw error;
    }
    throw new ImageGenerationError(
      `OpenAI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'openai',
      error
    );
  }
}

/**
 * Higgsfield APIで画像を生成
 */
async function generateHiggsfieldImage(
  options: HiggsfieldImageOptions
): Promise<ImageGenerationResponse> {
  const apiKeyId = process.env.NEXT_PUBLIC_HIGGSFIELD_API_KEY_ID;
  const apiKeySecret = process.env.NEXT_PUBLIC_HIGGSFIELD_API_KEY_SECRET;
  const endpoint = process.env.NEXT_PUBLIC_HIGGSFIELD_API_ENDPOINT || 'https://api.higgsfield.ai';

  if (!apiKeyId || !apiKeySecret) {
    throw new ImageGenerationError(
      'Higgsfield API credentials are not configured',
      'higgsfield'
    );
  }

  const {
    prompt,
    width = 1024,
    height = 1024,
    steps = 20,
    guidance_scale = 7.5,
  } = options;

  try {
    // Higgsfield APIの認証（Basic認証またはBearer認証を使用）
    // APIドキュメントに基づいて実装を調整する必要があります
    const authHeader = `Basic ${btoa(`${apiKeyId}:${apiKeySecret}`)}`;

    // Higgsfield APIのエンドポイント（実際のAPI仕様に合わせて調整）
    const response = await fetch(`${endpoint}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        steps,
        guidance_scale,
        response_format: 'b64_json', // Base64形式で直接取得
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ImageGenerationError(
        errorData.error?.message || `Higgsfield API error: ${response.statusText}`,
        'higgsfield',
        errorData
      );
    }

    const data = await response.json();
    
    // Base64形式で直接返される場合
    if (data.data?.[0]?.b64_json) {
      return {
        success: true,
        imageBase64: `data:image/png;base64,${data.data[0].b64_json}`,
        provider: 'higgsfield',
      };
    }

    // URL形式で返される場合
    if (data.data?.[0]?.url) {
      const imageBase64 = await urlToBase64(data.data[0].url);
      return {
        success: true,
        imageBase64,
        imageUrl: data.data[0].url,
        provider: 'higgsfield',
      };
    }

    throw new ImageGenerationError(
      'No image data returned from Higgsfield API',
      'higgsfield'
    );
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw error;
    }
    throw new ImageGenerationError(
      `Higgsfield image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'higgsfield',
      error
    );
  }
}

/**
 * 画像生成の統一インターフェース
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResponse> {
  try {
    switch (options.provider) {
      case 'openai':
        return await generateOpenAIImage(options);
      case 'higgsfield':
        return await generateHiggsfieldImage(options);
      default:
        throw new ImageGenerationError(
          `Unsupported provider: ${(options as { provider: string }).provider}`,
          options.provider as ImageGeneratorProvider
        );
    }
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return {
        success: false,
        error: error.message,
        provider: error.provider,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: options.provider,
    };
  }
}

