/**
 * Server-side JSONLD helpers for SvelteKit API routes.
 * Reads/writes episode JSONLD files directly from disk.
 */
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

// Workspace root — resolve relative to this file's location
// apps/web/src/lib/server/jsonld.ts → ../../../../.. = workspace root
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..', '..');
const PROJECT_DIR = process.env.PROJECT_DIR || '260208-spirit-in-physics';

export function projectRoot(): string {
	return join(WORKSPACE_ROOT, PROJECT_DIR);
}

export function storyboardPath(): string {
	return join(projectRoot(), 'resources', 'storyboard.jsonld');
}

/** Load and parse a JSON-LD file. */
export async function loadJsonLd(path: string): Promise<Record<string, any>> {
	const content = await readFile(path, 'utf-8');
	return JSON.parse(content);
}

/** Save a JSON-LD object to disk. */
export async function saveJsonLd(path: string, data: Record<string, any>): Promise<void> {
	await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}

/** Load the master storyboard and resolve all episode sourceFiles. */
export async function loadAggregatedStoryboard(): Promise<Record<string, any>> {
	const master = await loadJsonLd(storyboardPath());
	const episodes = master['gh:episodes'] as any[] ?? [];
	const resourcesDir = dirname(storyboardPath());

	for (const ep of episodes) {
		const sourceFile = ep['gh:sourceFile'] as string | undefined;
		if (!sourceFile) continue;
		const fullPath = join(resourcesDir, sourceFile);
		if (!existsSync(fullPath)) continue;
		try {
			const epData = await loadJsonLd(fullPath);
			// Merge episode data (keep sourceFile reference)
			for (const [k, v] of Object.entries(epData)) {
				if (k === '@context') continue;
				ep[k] = v;
			}
		} catch (err) {
			console.warn(`[jsonld] Failed to load ${fullPath}:`, err);
		}
	}

	return master;
}

/** Find an episode by ID in the aggregated storyboard. */
export async function findEpisode(episodeId: string): Promise<{
	master: Record<string, any>;
	episode: Record<string, any>;
	sourceFile: string;
	sourcePath: string;
} | null> {
	const master = await loadAggregatedStoryboard();
	const episodes = master['gh:episodes'] as any[] ?? [];
	const resourcesDir = dirname(storyboardPath());

	for (const ep of episodes) {
		if (ep['gh:episodeId'] === episodeId) {
			const sourceFile = ep['gh:sourceFile'] as string ?? '';
			const sourcePath = join(resourcesDir, sourceFile);
			return { master, episode: ep, sourceFile, sourcePath };
		}
	}
	return null;
}

/** Save an episode back to its source JSONLD file. */
export async function saveEpisode(
	episode: Record<string, any>,
	sourcePath: string,
	context?: Record<string, any>
): Promise<void> {
	const toSave: Record<string, any> = {};
	if (context) toSave['@context'] = context;
	for (const [k, v] of Object.entries(episode)) {
		if (k === 'gh:sourceFile') continue; // Don't save sourceFile inside the episode file
		toSave[k] = v;
	}
	await saveJsonLd(sourcePath, toSave);
}
