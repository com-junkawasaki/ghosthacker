import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { editOpenAIImage } from '$lib/server/external-image-gen';
import { imagesDir, getActiveProject } from '$lib/server/state';

function safeFilename(panel: any, version: number): string {
	const id = String(panel['@id'] || `p${panel.panel ?? '?'}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
	return `${id}_edit_v${version}.png`;
}

function decodeBase64Png(input: string): Buffer {
	const m = input.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.*)$/);
	const b64 = m ? m[1] : input;
	return Buffer.from(b64, 'base64');
}

function resolveImageDiskPath(imageUrl: string): string | null {
	const marker = '/resources/images/';
	const i = imageUrl.indexOf(marker);
	const rel = i >= 0
		? imageUrl.slice(i + marker.length)
		: imageUrl.startsWith('/images/')
			? imageUrl.slice('/images/'.length)
			: imageUrl;
	const full = join(imagesDir(), rel);
	return existsSync(full) ? full : null;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const {
		episodeId, pageNumber, panelIndex,
		prompt, sourceImage, sourceVersionIndex, persist
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		prompt?: string;
		/** Inline base64 PNG (data URL or raw). Takes priority over sourceVersionIndex. */
		sourceImage?: string;
		/** Index into panel's gh:generatedImages to use as source (default = currentImageIndex). */
		sourceVersionIndex?: number;
		persist?: boolean;
	};
	if (!episodeId || pageNumber == null || panelIndex == null || !prompt) {
		throw error(400, 'episodeId, pageNumber, panelIndex, prompt required');
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

	let imageBytes: Buffer | undefined;
	if (sourceImage) {
		imageBytes = decodeBase64Png(sourceImage);
	} else {
		const images: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
		if (!images.length) throw error(400, 'Panel has no generated images to edit');
		const idx = sourceVersionIndex ?? panel['gh:currentImageIndex'] ?? images.length - 1;
		const src = images[Math.max(0, Math.min(idx, images.length - 1))];
		const url = src?.['gh:imageUrl'] ?? src?.imageUrl;
		const disk = url ? resolveImageDiskPath(String(url)) : null;
		if (!disk) throw error(404, `Source image not found on disk: ${url}`);
		imageBytes = await fsReadFile(disk);
	}

	const result = await editOpenAIImage({ image: imageBytes, prompt });

	if (!persist) {
		return new Response(result.bytes, {
			headers: { 'Content-Type': 'image/png', 'X-Duration-Ms': String(result.durationMs) }
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
		'gh:imagePrompt': prompt,
		'gh:editPrompt': prompt,
		'gh:generatedAt': Math.floor(Date.now() / 1000),
		'gh:model': `openai/${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'}-edit`,
		'gh:durationMs': result.durationMs
	};
	panel['gh:generatedImages'] = [...existing, newEntry];
	panel['gh:currentImageIndex'] = panel['gh:generatedImages'].length - 1;
	panel['gh:generatedImageUrl'] = imageUrl;
	await saveJsonLd(found.sourcePath, sourceData);

	return json({
		success: true,
		project: getActiveProject(),
		imageUrl,
		durationMs: result.durationMs,
		index: panel['gh:currentImageIndex']
	});
};
