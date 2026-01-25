/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/fal-ai-client
 * 
 * fal.ai API client for frontend
 */

export interface FalImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  width?: number;
  height?: number;
  numImages?: number;
}

export interface FalImageGenerationResponse {
  images: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
}

export async function generateImageWithFal(
  options: FalImageGenerationOptions
): Promise<FalImageGenerationResponse> {
  const apiKey = process.env.NEXT_PUBLIC_FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY is not set');
  }

  const response = await fetch(`https://fal.run/models/${options.modelId}/inference`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      width: options.width || 1024,
      height: options.height || 1024,
      num_images: options.numImages || 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fal API error: ${response.statusText}`);
  }

  return response.json();
}

export async function listFalModels(): Promise<Array<{
  id: string;
  name: string;
  description?: string;
  preview_image_url?: string;
  model_type?: string;
}>> {
  const apiKey = process.env.NEXT_PUBLIC_FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY is not set');
  }

  const response = await fetch('https://fal.run/models', {
    headers: {
      'Authorization': `Key ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Fal API error: ${response.statusText}`);
  }

  return response.json();
}

