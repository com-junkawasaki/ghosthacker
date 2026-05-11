/**
 * Storyboard API client — fetch-based, calling SvelteKit API routes.
 * Drop-in replacement for the ConnectRPC-based client.
 */
import type { Panel, Episode, Arc } from '$lib/types/storyboard';

async function get<T>(path: string): Promise<T> {
	const res = await fetch(path);
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
	// Coerce BigInt → number so int64 fields produced by @bufbuild/protobuf
	// (e.g. GeneratedImage.generatedAt) survive JSON.stringify instead of
	// throwing "Do not know how to serialize a BigInt" and silently dropping
	// the request.
	const serialized = JSON.stringify(body, (_key, value) =>
		typeof value === 'bigint' ? Number(value) : value
	);
	const res = await fetch(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: serialized
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return res.json();
}

export async function loadStoryboard(_filePath?: string) {
	return get<{ jsonldContent: string }>('/api/storyboard');
}

export async function getEpisodes(_filePath?: string) {
	const { episodes } = await get<{ episodes: Episode[] }>('/api/episodes');
	return episodes;
}

export async function getEpisodePanels(_filePath: string, episodeId: string, _pageNumber?: number) {
	const { panels } = await get<{ panels: Panel[] }>(`/api/episodes/panels?episodeId=${encodeURIComponent(episodeId)}`);
	return panels;
}

export async function getArcs(_filePath?: string) {
	const { arcs } = await get<{ arcs: Arc[] }>('/api/arcs');
	return arcs;
}

export async function getArcPanels(_filePath: string, arcId: string) {
	const { panels } = await get<{ panels: Panel[] }>(`/api/arcs/panels?arcId=${encodeURIComponent(arcId)}`);
	return panels;
}

export async function listProjects() {
	return get<{ projects: { id: string; name: string; hasStoryboard: boolean }[]; activeProject: string }>('/api/projects');
}

export async function switchProject(projectId: string) {
	return post<{ success: boolean }>('/api/projects/switch', { projectId });
}

export async function exportPdf(_filePath: string, _episodeId: string, _arcId: string, _mode: string) {
	return { success: false, message: 'PDF export not yet migrated', pdfContent: null, filename: '' };
}

export function streamUpdates(
	_filePath: string, _sessionId: string, _onUpdate: (u: unknown) => void, _onError: (e: unknown) => void
): () => void {
	return () => {};
}

export async function listGenerationJobs() {
	return { jobs: [] as unknown[] };
}

export async function generatePanelDialogue(
	_filePath: string, _episodeId: string, _pageNumber: number, _panel: number,
	_panelData: unknown, _opts?: { maxLines?: number; style?: string; strictKnownFacts?: boolean }
) {
	return { success: false, message: 'Not migrated', dialogues: [] as unknown[] };
}

export async function submitGenerationJob(
	_filePath: string, _episodeId: string, _pageNumber: number, _panel: number,
	_panelData: unknown, _model?: string
) {
	return { jobId: '', success: false };
}

export async function cancelGenerationJob(_jobId: string) {
	return { success: false };
}

export async function generateSdxlImage(
	episodeId: string,
	pageNumber: number,
	panelIndex: number,
	overrides?: Record<string, unknown>
): Promise<{ success: boolean; imageUrl?: string; seed?: number; durationMs?: number; index?: number; message?: string }> {
	try {
		return await post('/api/panels/sdxl-generate', { episodeId, pageNumber, panelIndex, overrides });
	} catch (err) {
		return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/** Proxy object for components that call storyboardClient.method() directly. */
export const storyboardClient = {
	updatePanel: (req: { episodeId: string; pageNumber: number; panel: number; panelData: unknown; [k: string]: unknown }) =>
		post('/api/panels/update', req),
	movePanel: (req: { episodeId: string; sourcePage: number; sourcePanel: number; targetPage: number; targetPanelIndex: number; [k: string]: unknown }) =>
		post('/api/panels/move', req),
	loadStoryboard: (_req?: unknown) => get('/api/storyboard'),
	getEpisodes: (_req?: unknown) => get('/api/episodes'),
	getEpisodePanels: (req: { episodeId: string; [k: string]: unknown }) =>
		get(`/api/episodes/panels?episodeId=${encodeURIComponent(req.episodeId)}`),
	getArcs: (_req?: unknown) => get('/api/arcs'),
	getArcPanels: (req: { arcId: string; [k: string]: unknown }) =>
		get(`/api/arcs/panels?arcId=${encodeURIComponent(req.arcId)}`),
	listProjects: (_req?: unknown) => get('/api/projects'),
	switchProject: (req: { projectId: string }) => post('/api/projects/switch', req),
	exportPdf: (_req: unknown) => Promise.resolve({ success: false, message: 'Not migrated', pdfContent: null, filename: '' }),
	generatePanelImage: (_req: unknown) => Promise.resolve({ success: false, message: 'Not migrated' }),
	generateDialogue: (_req: unknown) => Promise.resolve({ success: false, message: 'Not migrated' }),
	submitGenerationJob: (_req: unknown) => Promise.resolve({ jobId: '', success: false }),
	cancelGenerationJob: (_req: unknown) => Promise.resolve({ success: false }),
	listGenerationJobs: (_req?: unknown) => Promise.resolve({ jobs: [] }),
};
