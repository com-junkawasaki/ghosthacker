/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/deepinfra-client
 * 
 * DeepInfra API client for frontend
 */

export interface DeepInfraImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
}

export interface DeepInfraImageGenerationResponse {
  images: string[]; // Base64 encoded images
}

export async function generateImageWithDeepInfra(
  options: DeepInfraImageGenerationOptions
): Promise<DeepInfraImageGenerationResponse> {
  const apiKey = process.env.NEXT_PUBLIC_DEEPINFRA_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY is not set');
  }

  const response = await fetch(`https://api.deepinfra.com/v1/inference/${options.modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      width: options.width || 1024,
      height: options.height || 1024,
      num_inference_steps: options.numInferenceSteps || 20,
      guidance_scale: options.guidanceScale || 7.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepInfra API error: ${response.statusText}`);
  }

  return response.json();
}

