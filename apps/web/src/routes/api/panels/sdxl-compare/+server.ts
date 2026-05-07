import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findEpisode } from '$lib/server/jsonld';
import { generateSdxlImg2Img } from '$lib/server/comfyui';
import { projectRoot } from '$lib/server/state';
import { cropFaceRegion } from '$lib/server/mask';
import { getCheckpointConfig } from '$lib/server/checkpoint-config';
import { generateOpenAIImage, isExternalEngine } from '$lib/server/external-image-gen';

const QUALITY_SUFFIX = ', masterpiece, high score, great score, absurdres';
const DEFAULT_NEGATIVE = [
	'lowres', 'worst quality', 'low quality', 'normal quality', 'bad anatomy', 'bad hands',
	'4koma', 'comic', 'greyscale', 'monochrome',
	'watermark', 'signature', 'jpeg artifacts', 'logo',
	'multiple panels', 'comic page layout', 'tiled grid', 'collage', 'montage',
	'multiple frames', 'split screen',
	'photograph', 'photorealistic', '3d render',
	'wings', 'nsfw'
].join(', ');
const POSITIVE_REWRITES: Array<[RegExp, string]> = [
	[/\bmanga panel\b/gi, 'solo'],
	[/\bmanga page\b/gi, 'solo']
];
const STRIP_WHEN_SCRIBBLE = [
	/\b(wide|medium|close[-_ ]?up|extreme[-_ ]?wide|extreme[-_ ]?close[-_ ]?up|insert|establishing|long|full)[-_ ]?shot\b/gi,
	/\b(high|low|eye[-_ ]?level|dutch|bird['s]*[-_ ]?eye|worm['s]*[-_ ]?eye|over[-_ ]?the[-_ ]?shoulder|flat)[-_ ]?angle\b/gi,
	/\b\d+(\.\d+)?[-_ ]?mm[-_ ]?lens\b/gi,
	/\b(dim|harsh|soft|dramatic|natural|warm|cool)[-_ ]?(light|lighting|streetlight)\b/gi,
	/\b(oppressive|melancholy|melancholic|tense|cinematic)[-_ ]?(mood|atmosphere)?\b/gi
];

function decodeBase64Png(input: string): Buffer {
	const m = input.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.*)$/);
	const b64 = m ? m[1] : input;
	return Buffer.from(b64, 'base64');
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const {
		episodeId, pageNumber, panelIndex,
		image, scribble, aiStrength, seed,
		checkpoints
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		image?: string;
		scribble?: string;
		aiStrength?: number;
		seed?: number;
		checkpoints?: string[];
	};
	if (!episodeId || pageNumber == null || panelIndex == null || !image) {
		throw error(400, 'episodeId, pageNumber, panelIndex, image required');
	}
	if (!checkpoints || !checkpoints.length) {
		throw error(400, 'checkpoints[] required');
	}

	const found = await findEpisode(episodeId);
	if (!found) throw error(404, `Episode not found: ${episodeId}`);
	const sourceData = JSON.parse(await fsReadFile(found.sourcePath, 'utf-8'));
	const page = (sourceData['gh:pages'] as any[] ?? []).find((pg) => pg['gh:pageNumber'] === pageNumber);
	if (!page) throw error(404, `Page ${pageNumber} not found`);
	const panel = (page['gh:panels'] as any[] ?? []).find((pn) => {
		const pi = pn['gh:panelIndex'] ?? pn['panel'];
		return pi === panelIndex || pi === panelIndex + 1;
	});
	if (!panel) throw error(404, `Panel ${panelIndex} not found`);

	const baseTags = Array.isArray(panel['gh:sdxlTags']) ? (panel['gh:sdxlTags'] as string[]).join(', ') : '';
	let basePositive = (panel['gh:sdxlPrompt'] as string) || baseTags || '';
	for (const [p, r] of POSITIVE_REWRITES) basePositive = basePositive.replace(p, r);
	if (scribble) for (const re of STRIP_WHEN_SCRIBBLE) basePositive = basePositive.replace(re, '');
	basePositive = basePositive.replace(/,\s*,+/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim() + QUALITY_SUFFIX;
	const panelNeg = Array.isArray(panel['gh:sdxlNegative']) ? panel['gh:sdxlNegative'].join(', ') : '';
	const baseNegative = [DEFAULT_NEGATIVE, panelNeg].filter(Boolean).join(', ');

	// Character refs (face crops)
	const characterIds: string[] = (panel['gh:characters'] ?? panel['characters'] ?? []).map((c: string) => String(c).replace(/^character:/, ''));
	const refBuffers: Buffer[] = [];
	for (const name of characterIds.slice(0, 5)) {
		const refPath = join(projectRoot(), 'resources', 'characters', name, 'reference.png');
		if (!existsSync(refPath)) continue;
		const facePath = join(projectRoot(), 'resources', 'characters', name, 'reference_face.png');
		let faceBuf: Buffer;
		if (existsSync(facePath)) {
			faceBuf = await fsReadFile(facePath);
		} else {
			const full = await fsReadFile(refPath);
			faceBuf = cropFaceRegion(full, 0.42);
			const { writeFile: wf } = await import('node:fs/promises');
			await wf(facePath, faceBuf);
		}
		refBuffers.push(faceBuf);
	}

	const initImage = decodeBase64Png(image);
	const scribbleImage = scribble ? decodeBase64Png(scribble) : undefined;
	const denoise = Math.min(0.95, Math.max(0.1, (aiStrength ?? 60) / 100));
	const sharedSeed = seed ?? Math.floor(Math.random() * 0xffffffff);
	const baseScribbleStrength = scribbleImage ? 0.45 : undefined;
	const scribbleStrength = refBuffers.length && baseScribbleStrength
		? baseScribbleStrength * 0.6
		: baseScribbleStrength;

	// Run sequentially (single GPU). Each checkpoint uses its own optimal config:
	// per-model steps/CFG/sampler/scheduler, Pony score-tag prefix, NoobAI Vpred handling.
	const results: Array<{ checkpoint: string; imageBase64?: string; durationMs?: number; error?: string }> = [];
	for (const ckpt of checkpoints) {
		try {
			if (isExternalEngine(ckpt)) {
				// External cloud engines (OpenAI gpt-image-1 etc.) get a plain prompt
				// with no SDXL-specific tags/Pony scaffolding.
				const cleanPrompt = basePositive
					.replace(/, masterpiece, high score, great score, absurdres$/, '')
					.replace(/\bsolo\b/g, '');
				if (ckpt === 'openai/gpt-image-1') {
					const r = await generateOpenAIImage({ prompt: `Anime manga panel illustration: ${cleanPrompt}`, seed: sharedSeed });
					results.push({ checkpoint: ckpt, imageBase64: 'data:image/png;base64,' + r.bytes.toString('base64'), durationMs: r.durationMs });
				} else {
					results.push({ checkpoint: ckpt, error: `Unknown external engine: ${ckpt}` });
				}
				continue;
			}
			const cfg = getCheckpointConfig(ckpt);
			const positive = cfg.positivePrefix ? cfg.positivePrefix + basePositive : basePositive;
			const negative = cfg.negativeAppend ? baseNegative + cfg.negativeAppend : baseNegative;
			const r = await generateSdxlImg2Img({
				positive, negative, initImage,
				denoise, seed: sharedSeed, checkpoint: ckpt,
				scribbleImage, scribbleStrength,
				preprocessScribble: 'canny',
				faceReferenceImages: refBuffers.length ? refBuffers : undefined,
				faceReferenceWeight: refBuffers.length > 1 ? 0.55 : 0.7,
				disableLightning: true
				// steps/cfg/sampler/scheduler/isVpred all picked up automatically from checkpoint config
			});
			results.push({ checkpoint: ckpt, imageBase64: 'data:image/png;base64,' + r.bytes.toString('base64'), durationMs: r.durationMs });
		} catch (err) {
			results.push({ checkpoint: ckpt, error: err instanceof Error ? err.message : String(err) });
		}
	}

	return json({ success: true, seed: sharedSeed, results });
};
