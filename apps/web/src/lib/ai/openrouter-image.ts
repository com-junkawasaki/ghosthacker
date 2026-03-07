/**
 * OpenRouter AI Image Generation Client
 * Uses Seedream 4.5 via OpenRouter
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
	void options;
	void OPENROUTER_API_KEY;
	void OPENROUTER_API_URL;
	return {
		success: false,
		error: 'Direct fetch-based OpenRouter calls are disabled. Use the backend Connect client APIs.',
	};
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
