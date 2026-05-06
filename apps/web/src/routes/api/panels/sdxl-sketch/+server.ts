import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { generateSdxlImg2Img } from '$lib/server/comfyui';
import { imagesDir, getActiveProject } from '$lib/server/state';

const STYLE_PRESETS: Record<string, { positive: string; negative?: string }> = {
	default: { positive: '' },
	none: { positive: '' },
	lineart: { positive: 'lineart, monochrome, ink drawing, clean line art, black and white' },
	watercolor: { positive: 'watercolor painting, soft brushstrokes, flowing colors, paper texture' },
	'oil painting': { positive: 'oil painting, thick impasto brushstrokes, classical art, painterly' },
	anime: { positive: 'anime style, cel shading, vibrant colors, manga aesthetic' },
	'3d render': { positive: '3d render, octane render, ray tracing, volumetric lighting, cgi' },
	photoreal: { positive: 'photorealistic, photograph, hyperdetailed, 8k, sharp focus, real life' },
	'pencil sketch': { positive: 'pencil sketch, graphite drawing, hatching, paper texture, monochrome' }
};

function safeFilename(panel: any, version: number): string {
	const id = String(panel['@id'] || `p${panel.panel ?? '?'}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
	return `${id}_sketch_v${version}.png`;
}

function decodeBase64Png(input: string): Buffer {
	const m = input.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.*)$/);
	const b64 = m ? m[1] : input;
	return Buffer.from(b64, 'base64');
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const {
		episodeId,
		pageNumber,
		panelIndex,
		image,
		scribble,
		aiStrength,
		style,
		extraPositive,
		seed,
		persist
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		image?: string;
		scribble?: string;
		aiStrength?: number;
		style?: string;
		extraPositive?: string;
		seed?: number;
		persist?: boolean;
	};
	if (!episodeId || pageNumber == null || panelIndex == null || !image) {
		throw error(400, 'episodeId, pageNumber, panelIndex, image required');
	}

	const found = await findEpisode(episodeId);
	if (!found) throw error(404, `Episode not found: ${episodeId}`);
	const sourceData = JSON.parse(await fsReadFile(found.sourcePath, 'utf-8'));
	const pages = sourceData['gh:pages'] as any[] ?? [];
	const page = pages.find((pg) => pg['gh:pageNumber'] === pageNumber);
	if (!page) throw error(404, `Page ${pageNumber} not found`);
	const panel = (page['gh:panels'] as any[] ?? []).find((pn) => {
		const pi = pn['gh:panelIndex'] ?? pn['panel'];
		return pi === panelIndex || pi === panelIndex + 1;
	});
	if (!panel) throw error(404, `Panel ${panelIndex} not found`);

	const baseTags = Array.isArray(panel['gh:sdxlTags']) ? (panel['gh:sdxlTags'] as string[]).join(', ') : '';
	const basePositive = (panel['gh:sdxlPrompt'] as string) || baseTags || '';
	const styleAdd = STYLE_PRESETS[(style || 'default').toLowerCase()]?.positive ?? '';
	const positive = [styleAdd, basePositive, extraPositive].filter(Boolean).join(', ');
	const negative = Array.isArray(panel['gh:sdxlNegative']) ? (panel['gh:sdxlNegative'] as string[]).join(', ') : '';

	const initImage = decodeBase64Png(image);
	const scribbleImage = scribble ? decodeBase64Png(scribble) : undefined;
	const denoise = Math.min(0.95, Math.max(0.1, (aiStrength ?? 60) / 100));

	const result = await generateSdxlImg2Img({
		positive,
		negative,
		initImage,
		denoise,
		seed,
		scribbleImage,
		scribbleStrength: scribbleImage ? Math.min(1, Math.max(0.3, denoise + 0.2)) : undefined
	});

	if (!persist) {
		return new Response(result.bytes, {
			headers: {
				'Content-Type': 'image/png',
				'X-Sdxl-Seed': String(result.seed),
				'X-Sdxl-Duration-Ms': String(result.durationMs)
			}
		});
	}

	const existing: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
	const nextVersion = existing.length + 1;
	const filename = safeFilename(panel, nextVersion);
	const relDir = join('episodes', episodeId, 'pages', String(pageNumber));
	const absDir = join(imagesDir(), relDir);
	await mkdir(absDir, { recursive: true });
	await writeFile(join(absDir, filename), result.bytes);

	const imageUrl = `/images/${relDir}/${filename}`.replace(/\\/g, '/');
	const newEntry = {
		'gh:imageUrl': imageUrl,
		'gh:imagePrompt': positive,
		'gh:negativePrompt': negative,
		'gh:generatedAt': Math.floor(Date.now() / 1000),
		'gh:model': 'sdxl/animaginexl-4.0-img2img',
		'gh:seed': result.seed,
		'gh:sdxlDenoise': denoise,
		'gh:sdxlStyle': style || 'default',
		'gh:sdxlDurationMs': result.durationMs
	};
	panel['gh:generatedImages'] = [...existing, newEntry];
	panel['gh:currentImageIndex'] = panel['gh:generatedImages'].length - 1;
	panel['gh:generatedImageUrl'] = imageUrl;
	await saveJsonLd(found.sourcePath, sourceData);

	return json({
		success: true,
		project: getActiveProject(),
		imageUrl,
		seed: result.seed,
		durationMs: result.durationMs,
		index: panel['gh:currentImageIndex']
	});
};
