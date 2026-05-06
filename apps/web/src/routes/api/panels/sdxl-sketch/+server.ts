import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { generateSdxlImg2Img, inpaintWithIPACharacter } from '$lib/server/comfyui';
import { imagesDir, getActiveProject, projectRoot } from '$lib/server/state';
import { verticalStrips, buildMaskPng, cropFaceRegion } from '$lib/server/mask';

// Tags in the stored SDXL prompt that confuse SDXL into generating manga pages
// (collage of panels) instead of a single illustration. Replace with safer aesthetic words.
const POSITIVE_REWRITES: Array<[RegExp, string]> = [
	[/\bmanga panel\b/gi, 'anime illustration'],
	[/\bmanga page\b/gi, 'anime illustration']
];

// Tags to drop when ControlNet handles composition — scribble defines framing,
// these only fight against the user's actual sketch.
const STRIP_WHEN_SCRIBBLE = [
	/\b(wide|medium|close[-_ ]?up|extreme[-_ ]?wide|extreme[-_ ]?close[-_ ]?up|insert|establishing|long|full)[-_ ]?shot\b/gi,
	/\b(high|low|eye[-_ ]?level|dutch|bird['s]*[-_ ]?eye|worm['s]*[-_ ]?eye|over[-_ ]?the[-_ ]?shoulder|flat)[-_ ]?angle\b/gi,
	/\b\d+(\.\d+)?[-_ ]?mm[-_ ]?lens\b/gi,
	/\b(dim|harsh|soft|dramatic|natural|warm|cool)[-_ ]?(light|lighting|streetlight)\b/gi,
	/\b(oppressive|melancholy|melancholic|tense|cinematic)[-_ ]?(mood|atmosphere)?\b/gi
];

// AnimagineXL 4.0 quality boosters for proper anime illustration look
const QUALITY_PREFIX = 'masterpiece, best quality, very aesthetic, anime illustration, ';

const DEFAULT_NEGATIVE = [
	'low quality', 'worst quality', 'normal quality', 'lowres', 'blurry',
	'deformed', 'extra fingers', 'bad anatomy', 'malformed hands', 'bad proportions',
	'watermark', 'signature', 'text overlay', 'logo', 'jpeg artifacts',
	'multiple panels', 'comic page layout', 'tiled grid', 'collage', 'montage',
	'multiple frames', 'split screen',
	'photograph', 'photorealistic', '3d render', 'monochrome', 'grayscale',
	'wings', 'nsfw'
].join(', ');

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
	let positive = [styleAdd, basePositive, extraPositive].filter(Boolean).join(', ');
	for (const [pattern, replacement] of POSITIVE_REWRITES) positive = positive.replace(pattern, replacement);

	// When user provides a scribble (ControlNet path), strip composition/lighting tags
	// that compete with the sketch, and prepend AnimagineXL quality boosters.
	const hasScribble = !!scribble;
	if (hasScribble) {
		for (const re of STRIP_WHEN_SCRIBBLE) positive = positive.replace(re, '');
		positive = positive.replace(/,\s*,+/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim();
		positive = QUALITY_PREFIX + positive;
	}

	const panelNegative = Array.isArray(panel['gh:sdxlNegative']) ? (panel['gh:sdxlNegative'] as string[]).join(', ') : '';
	const negative = [DEFAULT_NEGATIVE, panelNegative].filter(Boolean).join(', ');

	const initImage = decodeBase64Png(image);
	const scribbleImage = scribble ? decodeBase64Png(scribble) : undefined;
	const denoise = Math.min(0.95, Math.max(0.1, (aiStrength ?? 60) / 100));

	// Resolve characters → load reference images. Up to 5 supported by IPAdapterCombineEmbeds.
	const characterIds: string[] = (panel['gh:characters'] ?? panel['characters'] ?? []).map((c: string) => String(c).replace(/^character:/, ''));
	const charsWithRefs: { name: string; ref: Buffer }[] = [];
	for (const name of characterIds.slice(0, 5)) {
		const refPath = join(projectRoot(), 'resources', 'characters', name, 'reference.png');
		if (!existsSync(refPath)) continue;
		// Cache face crops next to the source ref so we only crop once per character.
		const facePath = join(projectRoot(), 'resources', 'characters', name, 'reference_face.png');
		let faceBuf: Buffer;
		if (existsSync(facePath)) {
			faceBuf = await fsReadFile(facePath);
		} else {
			const full = await fsReadFile(refPath);
			faceBuf = cropFaceRegion(full, 0.42);
			await writeFile(facePath, faceBuf);
		}
		charsWithRefs.push({ name, ref: faceBuf });
	}
	const refBuffers = charsWithRefs.map((c) => c.ref);

	// Single sketch pass with combined IPA-Face embeds. Trust the prompt + tags
	// to place each character; no spatial detection needed.
	// When IPA is active, dial the scribble down so the character refs aren't fighting
	// the literal stroke shapes — the scribble becomes a soft composition hint.
	const ipaActive = refBuffers.length > 0;
	const baseScribbleStrength = scribbleImage ? Math.min(1, Math.max(0.3, denoise + 0.2)) : undefined;
	const scribbleStrength = ipaActive && baseScribbleStrength
		? Math.max(0.35, baseScribbleStrength * 0.55)
		: baseScribbleStrength;

	const result = await generateSdxlImg2Img({
		positive,
		negative,
		initImage,
		denoise,
		seed,
		scribbleImage,
		scribbleStrength,
		faceReferenceImages: refBuffers.length ? refBuffers : undefined,
		faceReferenceWeight: charsWithRefs.length > 1 ? 0.55 : 0.7
	});

	const faceReferenceCharacter = charsWithRefs[0]?.name;

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
	const newEntry: Record<string, unknown> = {
		'gh:imageUrl': imageUrl,
		'gh:imagePrompt': positive,
		'gh:negativePrompt': negative,
		'gh:generatedAt': Math.floor(Date.now() / 1000),
		'gh:model': charsWithRefs.length > 1
			? `sdxl/animaginexl-4.0+ipa-multi(${charsWithRefs.map((c) => c.name).join(',')})`
			: faceReferenceCharacter
				? `sdxl/animaginexl-4.0+ipa-face(${faceReferenceCharacter})`
				: 'sdxl/animaginexl-4.0-img2img',
		'gh:seed': result.seed,
		'gh:sdxlDenoise': denoise,
		'gh:sdxlStyle': style || 'default',
		'gh:sdxlDurationMs': result.durationMs
	};
	if (faceReferenceCharacter) newEntry['gh:faceReference'] = faceReferenceCharacter;
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
