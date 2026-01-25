/**
 * OpenRouter AI Image Generation Client
 * Uses Gemini 3 Pro Image Preview via OpenRouter
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ImageGenerationOptions {
	prompt: string;
	model?: string;
	aspectRatio?: string;
	imageSize?: string;
}

export interface ImageGenerationResponse {
	success: boolean;
	imageUrl?: string;
	error?: string;
}

/**
 * Generate image using OpenRouter AI (Gemini 3 Pro Image Preview)
 */
export async function generateImage(
	options: ImageGenerationOptions
): Promise<ImageGenerationResponse> {
	if (!OPENROUTER_API_KEY) {
		return {
			success: false,
			error: 'OPENROUTER_API_KEY is not set. Please set VITE_OPENROUTER_API_KEY environment variable.',
		};
	}

	const {
		prompt,
		model = 'google/gemini-3-pro-image-preview',
		aspectRatio = '16:9',
		imageSize = '1024x1024',
	} = options;

	try {
		console.log('[openrouter-image] Generating image with prompt:', prompt);
		console.log('[openrouter-image] Model:', model);

		const response = await fetch(OPENROUTER_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'HTTP-Referer': window.location.origin,
				'X-Title': 'ghosthacker-storyboard-editor',
			},
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: prompt }],
				modalities: ['text', 'image'],
				image_config: {
					aspect_ratio: aspectRatio,
					image_size: imageSize,
				},
				stream: false,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[openrouter-image] API error:', errorData);
			return {
				success: false,
				error: `OpenRouter API error (${response.status}): ${JSON.stringify(errorData)}`,
			};
		}

		const result = (await response.json()) as any;
		console.log('[openrouter-image] Response:', result);

		// Extract image URL from response
		// OpenRouter image output is typically a data URL under:
		// choices[0].message.images[0].image_url.url
		const imageUrl =
			result?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
			result?.choices?.[0]?.message?.images?.[0]?.image_url ??
			null;

		if (!imageUrl || typeof imageUrl !== 'string') {
			console.error('[openrouter-image] No image in response:', result);
			return {
				success: false,
				error: 'No image returned from OpenRouter (missing choices[0].message.images[0])',
			};
		}

		console.log('[openrouter-image] Image generated successfully');
		return {
			success: true,
			imageUrl,
		};
	} catch (error) {
		console.error('[openrouter-image] Error generating image:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Build prompt from panel data
 */
export function buildImagePrompt(
	visualNote: string,
	content: {
		characters?: string[];
		environment?: string;
		shot?: string;
		dialogue?: Array<{ speaker: string; text: string }>;
		cameraDirection?: string;
	}
): string {
	const parts: string[] = [];

	// Visual note is the primary description
	if (visualNote) {
		parts.push(visualNote);
	}

	// Add shot type
	if (content.shot) {
		parts.push(`Shot type: ${content.shot}`);
	}

	// Add characters
	if (content.characters && content.characters.length > 0) {
		parts.push(`Characters: ${content.characters.join(', ')}`);
	}

	// Add environment
	if (content.environment) {
		parts.push(`Environment: ${content.environment}`);
	}

	// Add dialogue context
	if (content.dialogue && content.dialogue.length > 0) {
		const dialogueText = content.dialogue
			.map((d) => `${d.speaker}: ${d.text}`)
			.join(' ');
		parts.push(`Dialogue: ${dialogueText}`);
	}

	// Add camera direction
	if (content.cameraDirection) {
		parts.push(`Camera: ${content.cameraDirection}`);
	}

	return parts.join('. ');
}
