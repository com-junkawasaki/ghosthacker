import { END, START, StateGraph, Annotation } from '@langchain/langgraph';
import { generateOpenAIImage, editOpenAIImage } from './external-image-gen';
import { buildOpenAIAlphaMaskPng, type Region } from './mask';

type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';
type ImageQuality = 'low' | 'medium' | 'high' | 'auto';

export interface LayeredStoryboardRequest {
	prompt: string;
	characterPrompt: string;
	referenceImages: Buffer[];
	size?: ImageSize;
	quality?: ImageQuality;
	model?: string;
	shot?: string;
	panelText?: string;
}

export interface LayeredStoryboardResult {
	bytes: Buffer;
	backgroundBytes: Buffer;
	maskBytes: Buffer;
	durationMs: number;
	stages: Array<{ name: string; durationMs?: number }>;
}

const GraphState = Annotation.Root({
	request: Annotation<LayeredStoryboardRequest>(),
	backgroundBytes: Annotation<Buffer | undefined>(),
	maskBytes: Annotation<Buffer | undefined>(),
	finalBytes: Annotation<Buffer | undefined>(),
	stages: Annotation<Array<{ name: string; durationMs?: number }>>({
		reducer: (left, right) => [...left, ...right],
		default: () => []
	}),
	durationMs: Annotation<number>({
		reducer: (left, right) => left + right,
		default: () => 0
	})
});

function dimensions(size: ImageSize | undefined): { width: number; height: number } {
	if (size === '1024x1536') return { width: 1024, height: 1536 };
	if (size === '1536x1024') return { width: 1536, height: 1024 };
	return { width: 1024, height: 1024 };
}

function characterRegion(req: LayeredStoryboardRequest): Region {
	const { width, height } = dimensions(req.size);
	const text = `${req.shot || ''} ${req.panelText || ''}`.toLowerCase();
	const count = Math.max(1, Math.min(5, req.referenceImages.length));
	if (/wide|establishing|引き|全景|部屋全体|教室全体|壁/.test(text)) {
		return { x: Math.round(width * 0.18), y: Math.round(height * 0.18), width: Math.round(width * 0.64), height: Math.round(height * 0.72) };
	}
	if (/close|アップ|顔|目/.test(text)) {
		return { x: Math.round(width * 0.12), y: Math.round(height * 0.04), width: Math.round(width * 0.76), height: Math.round(height * 0.86) };
	}
	if (count >= 3) {
		return { x: Math.round(width * 0.06), y: Math.round(height * 0.14), width: Math.round(width * 0.88), height: Math.round(height * 0.78) };
	}
	if (count === 2) {
		return { x: Math.round(width * 0.10), y: Math.round(height * 0.12), width: Math.round(width * 0.80), height: Math.round(height * 0.78) };
	}
	return { x: Math.round(width * 0.22), y: Math.round(height * 0.10), width: Math.round(width * 0.58), height: Math.round(height * 0.82) };
}

function backgroundPrompt(req: LayeredStoryboardRequest): string {
	return [
		'Create only the background, room, props, devices, lighting, camera framing, and spatial composition for this manga storyboard panel.',
		'Do not draw any people, faces, portraits, bodies, silhouettes, character close-ups, speech bubbles, captions, or readable English text.',
		'Leave natural empty space where characters can be inserted later. Prioritize the exact described setting and objects.',
		req.prompt
	].join(' ');
}

function editPrompt(req: LayeredStoryboardRequest): string {
	return [
		'Edit only the transparent masked area of the first image. Preserve the unmasked background, room layout, props, devices, and perspective.',
		'Insert the scene characters into the masked area so they fit the existing space and camera angle.',
		'Use the additional reference image(s) only for character identity: face shape, eye design, hairstyle, age impression, and manga line style.',
		'Do not copy reference clothing, pose, background, or props. Clothing and pose must follow this scene.',
		req.characterPrompt || req.prompt
	].join(' ');
}

const graph = new StateGraph(GraphState)
	.addNode('generateBackground', async (state) => {
		const started = Date.now();
		const result = await generateOpenAIImage({
			prompt: backgroundPrompt(state.request),
			...(state.request.size ? { size: state.request.size } : {}),
			...(state.request.quality ? { quality: state.request.quality } : {}),
			...(state.request.model ? { model: state.request.model } : {})
		});
		return {
			backgroundBytes: result.bytes,
			durationMs: result.durationMs,
			stages: [{ name: 'generateBackground', durationMs: Date.now() - started }]
		};
	})
	.addNode('buildCharacterMask', async (state) => {
		const started = Date.now();
		const { width, height } = dimensions(state.request.size);
		const maskBytes = buildOpenAIAlphaMaskPng(characterRegion(state.request), width, height, 72);
		return {
			maskBytes,
			stages: [{ name: 'buildCharacterMask', durationMs: Date.now() - started }]
		};
	})
	.addNode('editCharactersIntoScene', async (state) => {
		if (!state.backgroundBytes || !state.maskBytes) throw new Error('Layered image graph missing background or mask');
		const started = Date.now();
		const result = await editOpenAIImage({
			image: state.backgroundBytes,
			mask: state.maskBytes,
			referenceImages: state.request.referenceImages,
			prompt: editPrompt(state.request),
			...(state.request.size ? { size: state.request.size } : {}),
			...(state.request.quality ? { quality: state.request.quality } : {}),
			...(state.request.model ? { model: state.request.model } : {})
		});
		return {
			finalBytes: result.bytes,
			durationMs: result.durationMs,
			stages: [{ name: 'editCharactersIntoScene', durationMs: Date.now() - started }]
		};
	})
	.addEdge(START, 'generateBackground')
	.addEdge('generateBackground', 'buildCharacterMask')
	.addEdge('buildCharacterMask', 'editCharactersIntoScene')
	.addEdge('editCharactersIntoScene', END)
	.compile();

export async function generateLayeredStoryboardImage(req: LayeredStoryboardRequest): Promise<LayeredStoryboardResult> {
	const started = Date.now();
	const state = await graph.invoke({ request: req });
	if (!state.finalBytes || !state.backgroundBytes || !state.maskBytes) throw new Error('Layered image graph did not produce an image');
	return {
		bytes: state.finalBytes,
		backgroundBytes: state.backgroundBytes,
		maskBytes: state.maskBytes,
		durationMs: Date.now() - started,
		stages: state.stages
	};
}
