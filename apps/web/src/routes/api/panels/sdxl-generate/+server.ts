import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { generateSdxl } from '$lib/server/comfyui';
import { imagesDir, getActiveProject } from '$lib/server/state';

function safeFilename(panel: any, version: number): string {
	const id = String(panel['@id'] || `p${panel.panel ?? '?'}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
	return `${id}_sdxl_v${version}.png`;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { episodeId, pageNumber, panelIndex, overrides } = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		overrides?: {
			positive?: string;
			negative?: string;
			width?: number;
			height?: number;
			steps?: number;
			cfg?: number;
			sampler?: string;
			scheduler?: string;
			seed?: number;
			checkpoint?: string;
		};
	};
	if (!episodeId || pageNumber == null || panelIndex == null) {
		throw error(400, 'episodeId, pageNumber and panelIndex are required');
	}

	const found = await findEpisode(episodeId);
	if (!found) throw error(404, `Episode not found: ${episodeId}`);

	const original = JSON.parse(JSON.stringify(found.episode)) as any;
	const sourceData = await import('node:fs/promises').then((fs) => fs.readFile(found.sourcePath, 'utf-8')).then(JSON.parse);
	const pages = sourceData['gh:pages'] as any[] ?? [];
	const page = pages.find((pg) => pg['gh:pageNumber'] === pageNumber);
	if (!page) throw error(404, `Page ${pageNumber} not found in ${episodeId}`);
	const panels = page['gh:panels'] as any[] ?? [];
	const panel = panels.find((pn) => {
		const pi = pn['gh:panelIndex'] ?? pn['panel'];
		return pi === panelIndex || pi === panelIndex + 1;
	});
	if (!panel) throw error(404, `Panel ${panelIndex} not found on page ${pageNumber}`);

	const positive = overrides?.positive
		?? panel['gh:sdxlPrompt']
		?? (Array.isArray(panel['gh:sdxlTags']) ? panel['gh:sdxlTags'].join(', ') : '');
	const negative = overrides?.negative
		?? (Array.isArray(panel['gh:sdxlNegative']) ? panel['gh:sdxlNegative'].join(', ') : '');
	if (!positive) throw error(400, 'Panel has no SDXL prompt or tags. Run the tag generator first.');

	const result = await generateSdxl({
		positive,
		negative,
		width: overrides?.width,
		height: overrides?.height,
		steps: overrides?.steps,
		cfg: overrides?.cfg,
		sampler: overrides?.sampler,
		scheduler: overrides?.scheduler,
		seed: overrides?.seed,
		checkpoint: overrides?.checkpoint
	});

	const existing: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
	const nextVersion = existing.length + 1;
	const filename = safeFilename(panel, nextVersion);
	const relDir = join('episodes', episodeId, 'pages', String(pageNumber));
	const absDir = join(imagesDir(), relDir);
	await mkdir(absDir, { recursive: true });
	const absPath = join(absDir, filename);
	await writeFile(absPath, result.bytes);

	const imageUrl = `/images/${relDir}/${filename}`.replace(/\\/g, '/');
	const newEntry = {
		'gh:imageUrl': imageUrl,
		'gh:imagePrompt': positive,
		'gh:negativePrompt': negative,
		'gh:generatedAt': Math.floor(Date.now() / 1000),
		'gh:model': `sdxl/${(overrides?.checkpoint || process.env.SDXL_DEFAULT_CHECKPOINT || 'animagine-xl-4.0').replace(/\.safetensors$/, '')}`,
		'gh:seed': result.seed,
		'gh:sdxlSampler': overrides?.sampler || 'euler_ancestral',
		'gh:sdxlScheduler': overrides?.scheduler || 'normal',
		'gh:sdxlSteps': overrides?.steps || 28,
		'gh:sdxlCfg': overrides?.cfg || 6,
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
