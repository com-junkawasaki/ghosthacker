/**
 * Server-side JSONLD helpers.
 * Reads/writes episode JSONLD files directly from disk.
 */
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { storyboardPath, getWorkspaceRoot, getActiveProject } from './state';
import type { Episode, Arc, Panel, PanelData, Dialogue, GeneratedImage } from '$lib/types/storyboard';

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

/** Find an episode by ID. */
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

/** Extract episodes list from aggregated storyboard. */
export async function getEpisodes(): Promise<Episode[]> {
	const master = await loadAggregatedStoryboard();
	const episodes = master['gh:episodes'] as any[] ?? [];
	return episodes.map((ep: any) => ({
		id: ep['gh:episodeId'] ?? '',
		title: ep['dct:title'] ?? '',
		totalPages: (ep['gh:pages'] as any[] ?? []).length
	}));
}

/** Extract arcs list from aggregated storyboard. */
export async function getArcs(): Promise<Arc[]> {
	const master = await loadAggregatedStoryboard();
	const arcs = master['gh:arcs'] as any[] ?? [];
	return arcs.map((a: any) => ({
		id: a['gh:arc'] ?? '',
		title: a['gh:arc'] ?? '',
		description: a['gh:description'] ?? '',
		episodeIds: a['gh:episodeIds'] ?? []
	}));
}

// ---- Panel extraction (port of Go extractPanelData) ----

function str(obj: any, ...keys: string[]): string {
	for (const k of keys) {
		const v = obj[k];
		if (typeof v === 'string') return v;
		if (v && typeof v === 'object') {
			if ('en' in v) return v.en;
			if ('ja' in v) return v.ja;
		}
	}
	return '';
}

function extractDialogue(raw: any): Dialogue {
	return {
		speaker: str(raw, 'gh:speaker', 'speaker'),
		text: str(raw, 'en', 'text'),
		delivery: str(raw, 'gh:delivery'),
		subtext: str(raw, 'gh:subtext'),
		emotion: str(raw, 'gh:emotion'),
		pauseBeforeMs: raw['gh:pauseBeforeMs'] ?? 0,
		pauseAfterMs: raw['gh:pauseAfterMs'] ?? 0,
		mangaLayout: raw['gh:mangaLayout'] ? {
			text: raw['gh:mangaLayout'].text ?? '',
			type: raw['gh:mangaLayout'].type ?? 'dialogue',
			x: raw['gh:mangaLayout'].x ?? 0,
			y: raw['gh:mangaLayout'].y ?? 0,
			fontSize: raw['gh:mangaLayout'].fontSize ?? 12,
			style: raw['gh:mangaLayout'].style ?? 'horizontal'
		} : undefined
	};
}

function extractPanel(raw: any, pageNum: number, panelIdx: number): Panel {
	const dialogues: Dialogue[] = [];

	// gh:dialogue
	for (const d of (raw['gh:dialogue'] ?? raw['dialogue'] ?? [])) {
		const dlg = extractDialogue(d);
		if (dlg.speaker || dlg.text) dialogues.push(dlg);
	}

	// gh:caption, gh:neiCaption, gh:systemCaption → treated as dialogue
	for (const [key, speaker] of [['gh:caption', 'narration'], ['gh:neiCaption', 'neiCaption'], ['gh:systemCaption', 'systemCaption']] as const) {
		for (const c of (raw[key] ?? [])) {
			const text = str(c, 'en', 'text');
			if (!text) continue;
			const type = c['gh:type'] ?? speaker;
			dialogues.push({ speaker: type, text, delivery: '', subtext: '', emotion: '', pauseBeforeMs: 0, pauseAfterMs: 0 });
		}
	}

	// Generated images
	const genImages: GeneratedImage[] = (raw['gh:generatedImages'] ?? []).map((img: any) => ({
		imageUrl: img['gh:imageUrl'] ?? img['imageUrl'] ?? '',
		imagePrompt: img['gh:imagePrompt'] ?? img['imagePrompt'] ?? '',
		generatedAt: Number(img['gh:generatedAt'] ?? img['generatedAt'] ?? 0),
		model: img['gh:model'] ?? img['model'] ?? ''
	}));

	const data: PanelData = {
		characters: raw['gh:characters'] ?? raw['characters'] ?? [],
		dialogue: dialogues,
		environment: str(raw, 'gh:environment', 'environment'),
		visualNote: str(raw, 'gh:visual', 'visual'),
		cameraDirection: str(raw, 'gh:cameraDirection', 'cameraDirection'),
		durationSeconds: raw['gh:durationSeconds'] ?? 0,
		cutNumber: str(raw, 'gh:cutNumber'),
		shot: str(raw, 'gh:shot', 'shot'),
		runwayPrompt: str(raw, 'gh:runwayPrompt', 'runwayPrompt'),
		generatedImageUrl: str(raw, 'gh:generatedImageUrl'),
		imagePrompt: str(raw, 'gh:imagePrompt'),
		generatedImages: genImages,
		currentImageIndex: raw['gh:currentImageIndex'] ?? (genImages.length > 0 ? genImages.length - 1 : 0),
		mangaLayout: raw['gh:mangaLayout'] ? {
			panels: (raw['gh:mangaLayout'].panels ?? []).map((p: any) => ({
				panelIndex: p.panelIndex ?? 0, x: p.x ?? 0, y: p.y ?? 0,
				width: p.width ?? 100, height: p.height ?? 100,
				shape: p.shape ?? 'rectangle', zIndex: p.zIndex ?? 0,
				imageX: p.imageX ?? 50, imageY: p.imageY ?? 50, imageScale: p.imageScale ?? 1
			})),
			texts: (raw['gh:mangaLayout'].texts ?? []).map((t: any) => ({
				text: t.text ?? '', type: t.type ?? '', x: t.x ?? 0, y: t.y ?? 0,
				fontSize: t.fontSize ?? 12, style: t.style ?? ''
			}))
		} : undefined
	};

	return {
		pageNumber: pageNum,
		panel: panelIdx,
		cutNumber: str(raw, 'gh:cutNumber', 'cutNumber'),
		data
	};
}

/** Get all panels for an episode. */
export async function getEpisodePanels(episodeId: string): Promise<Panel[]> {
	const result = await findEpisode(episodeId);
	if (!result) return [];

	const pages = result.episode['gh:pages'] as any[] ?? [];
	const panels: Panel[] = [];

	for (const page of pages) {
		const pageNum = page['gh:pageNumber'] ?? 0;
		const pagePanels = page['gh:panels'] as any[] ?? [];
		for (const raw of pagePanels) {
			const idx = raw['gh:panelIndex'] ?? raw['panel'] ?? (pagePanels.indexOf(raw) + 1);
			panels.push(extractPanel(raw, pageNum, idx));
		}
	}
	return panels;
}

/** Get all panels for an arc (across episodes). */
export async function getArcPanels(arcId: string): Promise<Panel[]> {
	const arcs = await getArcs();
	const arc = arcs.find(a => a.id === arcId);
	if (!arc) return [];

	const allPanels: Panel[] = [];
	for (const epId of arc.episodeIds) {
		const ep = await getEpisodePanels(epId);
		allPanels.push(...ep);
	}
	return allPanels;
}

/** Update a panel's data in the episode JSONLD file. */
export async function updatePanel(
	episodeId: string,
	pageNumber: number,
	panelIndex: number,
	panelData: Partial<PanelData>
): Promise<void> {
	const result = await findEpisode(episodeId);
	if (!result) throw new Error(`Episode not found: ${episodeId}`);

	// Load original file
	const original = await loadJsonLd(result.sourcePath);
	const pages = original['gh:pages'] as any[] ?? [];

	for (const page of pages) {
		if (page['gh:pageNumber'] !== pageNumber) continue;
		const panels = page['gh:panels'] as any[] ?? [];
		for (const panel of panels) {
			const pi = panel['gh:panelIndex'] ?? panel['panel'];
			if (pi !== panelIndex && pi !== panelIndex + 1) continue;

			// Merge dialogue
			if (panelData.dialogue) {
				panel['gh:dialogue'] = panelData.dialogue.map(d => {
					const obj: any = { 'gh:speaker': d.speaker, 'en': d.text };
					if (d.delivery) obj['gh:delivery'] = d.delivery;
					if (d.subtext) obj['gh:subtext'] = d.subtext;
					if (d.emotion) obj['gh:emotion'] = d.emotion;
					if (d.pauseBeforeMs) obj['gh:pauseBeforeMs'] = d.pauseBeforeMs;
					if (d.pauseAfterMs) obj['gh:pauseAfterMs'] = d.pauseAfterMs;
					if (d.mangaLayout) obj['gh:mangaLayout'] = d.mangaLayout;
					return obj;
				});
			}

			// Merge other fields
			if (panelData.characters) panel['gh:characters'] = panelData.characters;
			if (panelData.environment) panel['gh:environment'] = panelData.environment;
			if (panelData.visualNote) panel['gh:visual'] = { en: panelData.visualNote };
			if (panelData.shot) panel['gh:shot'] = panelData.shot;
			if (panelData.cameraDirection) panel['gh:cameraDirection'] = panelData.cameraDirection;
			if (panelData.mangaLayout) panel['gh:mangaLayout'] = panelData.mangaLayout;
			if (panelData.generatedImages) {
				panel['gh:generatedImages'] = panelData.generatedImages.map(img => ({
					'gh:imageUrl': img.imageUrl, 'gh:imagePrompt': img.imagePrompt,
					'gh:generatedAt': img.generatedAt, 'gh:model': img.model
				}));
			}
			if (panelData.currentImageIndex != null) panel['gh:currentImageIndex'] = panelData.currentImageIndex;

			break;
		}
		break;
	}

	await saveJsonLd(result.sourcePath, original);
}

/** List projects in workspace. */
export async function listProjects(): Promise<{ projects: { id: string; name: string; hasStoryboard: boolean }[]; activeProject: string }> {
	const ws = getWorkspaceRoot();
	const entries = await readdir(ws);
	const projects: { id: string; name: string; hasStoryboard: boolean }[] = [];

	for (const entry of entries) {
		if (!entry.startsWith('26')) continue;
		const fullPath = join(ws, entry);
		const s = await stat(fullPath).catch(() => null);
		if (!s?.isDirectory()) continue;
		const hasSb = existsSync(join(fullPath, 'resources', 'storyboard.jsonld'));
		projects.push({ id: entry, name: entry, hasStoryboard: hasSb });
	}

	return { projects, activeProject: getActiveProject() };
}
