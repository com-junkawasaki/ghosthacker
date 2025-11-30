/**
 * LLM Generation Service
 * 文書と画像の生成サービス
 */

export interface LLMGenerationOptions {
  provider: 'openai' | 'anthropic' | 'custom';
  modelId: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface DocumentGenerationResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}

/**
 * 文書生成（OpenAI GPT-4 / Anthropic Claude）
 */
export async function generateDocument(
  options: LLMGenerationOptions
): Promise<DocumentGenerationResult> {
  try {
    const response = await fetch('/api/llm/generate/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Document generation failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 画像生成（OpenAI DALL-E / その他プロバイダー）
 */
export async function generateImage(
  options: LLMGenerationOptions & {
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  }
): Promise<ImageGenerationResult> {
  try {
    const response = await fetch('/api/llm/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Image generation failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      imageUrl: data.imageUrl,
      imageBase64: data.imageBase64,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

