import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { generateSdxlImg2Img, inpaintWithIPACharacter } from '$lib/server/comfyui';
import { imagesDir, getActiveProject, projectRoot } from '$lib/server/state';
import { verticalStrips, buildMaskPng, cropFaceRegion } from '$lib/server/mask';
import { getCheckpointConfig } from '$lib/server/checkpoint-config';
import { generateOpenAIImage } from '$lib/server/external-image-gen';

// Tags in the stored SDXL prompt that confuse SDXL into generating manga pages
// (collage of panels) instead of a single illustration. Replace with safer aesthetic words.
const POSITIVE_REWRITES: Array<[RegExp, string]> = [
	[/\bmanga panel\b/gi, 'solo'],
	[/\bmanga page\b/gi, 'solo']
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

// AnimagineXL 4.0 native quality booster format — appended at the END of positive.
// Per official docs (Cagliostro Research Lab).
const QUALITY_SUFFIX = ', masterpiece, high score, great score, absurdres';

// AnimagineXL 4.0 native negative prompt + anti-collage extras for our use case.
const DEFAULT_NEGATIVE = [
	'lowres', 'worst quality', 'low quality', 'normal quality', 'bad anatomy', 'bad hands',
	'4koma', 'comic', 'greyscale', 'monochrome',
	'watermark', 'signature', 'jpeg artifacts', 'logo',
	'multiple panels', 'comic page layout', 'tiled grid', 'collage', 'montage',
	'multiple frames', 'split screen',
	'photograph', 'photorealistic', '3d render',
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
		persist,
		checkpoint,
		preprocessScribble,
		refine,
		refineDenoise,
		refineSteps,
		engine,
		panelArrayIndex,
		imageQuality
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		panelArrayIndex?: number;
		imageQuality?: 'low' | 'medium' | 'high' | 'auto';
		image?: string;
		scribble?: string;
		aiStrength?: number;
		style?: string;
		extraPositive?: string;
		seed?: number;
		persist?: boolean;
		checkpoint?: string;
		preprocessScribble?: 'scribble' | 'lineart' | 'canny' | false;
		refine?: boolean;
		refineDenoise?: number;
		refineSteps?: number;
		engine?: 'openai' | 'sdxl';
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
	const panels = page['gh:panels'] as any[] ?? [];
	const panel = panelArrayIndex != null && panels[panelArrayIndex]
		? panels[panelArrayIndex]
		: panels.find((pn) => {
			const pi = pn['gh:panelIndex'] ?? pn['panel'];
			return pi === panelIndex;
		}) ?? panels.find((pn) => {
			const pi = pn['gh:panelIndex'] ?? pn['panel'];
			return pi === panelIndex + 1;
		});
	if (!panel) throw error(404, `Panel ${panelIndex} not found`);

	const baseTags = Array.isArray(panel['gh:sdxlTags']) ? (panel['gh:sdxlTags'] as string[]).join(', ') : '';
	const basePositive = (panel['gh:sdxlPrompt'] as string) || baseTags || '';
	const styleAdd = STYLE_PRESETS[(style || 'default').toLowerCase()]?.positive ?? '';
	let positive = [styleAdd, basePositive, extraPositive].filter(Boolean).join(', ');
	for (const [pattern, replacement] of POSITIVE_REWRITES) positive = positive.replace(pattern, replacement);

	// When user provides a scribble (ControlNet path), strip composition/lighting tags
	// that compete with the sketch.
	const hasScribble = !!scribble;
	if (hasScribble) {
		for (const re of STRIP_WHEN_SCRIBBLE) positive = positive.replace(re, '');
	}
	// Append AnimagineXL 4.0 native quality boosters at the END (per official spec).
	positive = positive
		.replace(/,\s*,+/g, ',')
		.replace(/^\s*,\s*|\s*,\s*$/g, '')
		.trim();
	positive = positive + QUALITY_SUFFIX;

	// Apply per-checkpoint prompt scaffolding (Pony score tags, etc.)
	const ckptCfg = getCheckpointConfig(checkpoint);
	if (ckptCfg.positivePrefix) positive = ckptCfg.positivePrefix + positive;

	const panelNegative = Array.isArray(panel['gh:sdxlNegative']) ? (panel['gh:sdxlNegative'] as string[]).join(', ') : '';
	const negative = [DEFAULT_NEGATIVE, panelNegative, ckptCfg.negativeAppend].filter(Boolean).join(', ');

	// Engine selection: default = openai (cloud, high quality, manga-style).
	// Override with engine: 'sdxl' to use the ComfyUI / AnimagineXL pipeline (free, faster, scribble-aware).
	const useEngine: 'openai' | 'sdxl' = engine === 'sdxl' ? 'sdxl' : (engine === 'openai' ? 'openai' : 'openai');

	if (useEngine === 'openai') {
		const characterIds: string[] = (panel['gh:characters'] ?? panel['characters'] ?? []).map((c: string) => String(c).replace(/^character:/, ''));
		const referenceImages: Buffer[] = [];
		for (const name of characterIds.slice(0, 5)) {
			const refPath = join(projectRoot(), 'resources', 'characters', name, 'reference.png');
			if (!existsSync(refPath)) continue;
			const facePath = join(projectRoot(), 'resources', 'characters', name, 'reference_face.png');
			if (existsSync(facePath)) {
				referenceImages.push(await fsReadFile(facePath));
			} else {
				const full = await fsReadFile(refPath);
				const faceBuf = cropFaceRegion(full, 0.42);
				await writeFile(facePath, faceBuf);
				referenceImages.push(faceBuf);
			}
		}
		// Strip SDXL-specific tag scaffolding for natural-language image-gen.
		const cleanPrompt = positive
			.replace(/\btext\s+['"][^'"]*['"]/gi, 'subtle unread message preview')
			.replace(/\bteen\s+(boy|girl)\b/gi, (_m, g) => g.toLowerCase() === 'boy' ? 'male student' : 'female student')
			.replace(/\bbedroom\b/gi, 'private room')
			.replace(/, masterpiece, high score, great score, absurdres$/, '')
			.replace(/\bsolo\b/g, '')
			.replace(/\b1(boy|girl)\b/g, (_m, g) => g === 'boy' ? '1 male character' : '1 female character');
		const referenceNote = referenceImages.length
			? ' Use the supplied face reference image(s) only for character identity: face shape, eye design, hairstyle, and manga line style. Do not preserve the reference outfit, clothing, pose, background, or props. Clothing must follow the current scene description, school setting, and panel prompt. Generate a new single-panel storyboard image for the described scene.'
			: '';
		const prompt = `Anime / manga panel illustration. ${cleanPrompt}.${referenceNote}`;
		const oai = await generateOpenAIImage({
			prompt,
			...(imageQuality ? { quality: imageQuality } : {}),
			...(referenceImages.length ? { referenceImages } : {})
		});

		if (!persist) {
			return new Response(oai.bytes, {
				headers: {
					'Content-Type': 'image/png',
					'X-Engine': 'openai',
					'X-Duration-Ms': String(oai.durationMs)
				}
			});
		}

		const existing: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
		const nextVersion = existing.length + 1;
		const filename = safeFilename(panel, nextVersion);
		const relDir = join('episodes', episodeId, 'pages', String(pageNumber));
		const absDir = join(imagesDir(), relDir);
		await mkdir(absDir, { recursive: true });
		await writeFile(join(absDir, filename), oai.bytes);
		const imageUrl = `/images/${relDir}/${filename}`.replace(/\\/g, '/');
		const newEntry: Record<string, unknown> = {
			'gh:imageUrl': imageUrl,
			'gh:imagePrompt': prompt,
			'gh:generatedAt': Math.floor(Date.now() / 1000),
			'gh:model': `openai/${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'}`,
			...(referenceImages.length ? { 'gh:referenceCharacters': characterIds.slice(0, 5) } : {}),
			'gh:durationMs': oai.durationMs
		};
		panel['gh:generatedImages'] = [...existing, newEntry];
		panel['gh:currentImageIndex'] = panel['gh:generatedImages'].length - 1;
		panel['gh:generatedImageUrl'] = imageUrl;
		await saveJsonLd(found.sourcePath, sourceData);
		return json({
			success: true,
			project: getActiveProject(),
			imageUrl,
			engine: 'openai',
			durationMs: oai.durationMs,
			index: panel['gh:currentImageIndex']
		});
	}

	// SDXL / ComfyUI pipeline (engine: 'sdxl')
	const initImage = decodeBase64Png(image);
	// Refine mode: skip scribble entirely; use the supplied image (the realtime preview)
	// as init for a high-quality polish pass with low denoise + more steps.
	const scribbleImage = !refine && scribble ? decodeBase64Png(scribble) : undefined;
	const denoise = refine
		? Math.min(0.6, Math.max(0.2, refineDenoise ?? 0.35))
		: Math.min(0.95, Math.max(0.1, (aiStrength ?? 60) / 100));

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
	// Quality-first defaults: skip Lightning LoRA so we get full 25-step AnimagineXL
	// rendering, and dial the scribble down so it acts as a soft composition hint
	// rather than literal pen strokes.
	const ipaActive = refBuffers.length > 0;
	const baseScribbleStrength = scribbleImage ? 0.45 : undefined;
	const scribbleStrength = ipaActive && baseScribbleStrength
		? baseScribbleStrength * 0.6
		: baseScribbleStrength;

	const result = await generateSdxlImg2Img({
		positive,
		negative,
		initImage,
		denoise,
		seed,
		checkpoint,
		scribbleImage,
		scribbleStrength,
		preprocessScribble: refine ? false : (preprocessScribble === undefined ? 'canny' : preprocessScribble),
		steps: refine ? (refineSteps ?? 30) : undefined,
		faceReferenceImages: refBuffers.length ? refBuffers : undefined,
		faceReferenceWeight: charsWithRefs.length > 1 ? 0.55 : 0.7,
		disableLightning: true
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
		'gh:model': (refine ? 'refined:' : '') + (charsWithRefs.length > 1
			? `sdxl/animaginexl-4.0+ipa-multi(${charsWithRefs.map((c) => c.name).join(',')})`
			: faceReferenceCharacter
				? `sdxl/animaginexl-4.0+ipa-face(${faceReferenceCharacter})`
				: 'sdxl/animaginexl-4.0-img2img'),
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
