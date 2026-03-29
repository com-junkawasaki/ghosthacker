import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findEpisode, loadJsonLd, saveJsonLd } from '$lib/server/jsonld';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { episodeId, sourcePage, sourcePanel, targetPage, targetPanelIndex } = body;

	if (!episodeId || sourcePage == null || sourcePanel == null || targetPage == null) {
		throw error(400, 'Missing required fields');
	}

	if (sourcePage === targetPage) {
		return json({ success: true, message: 'Same page, no move needed' });
	}

	// Find episode to get the source file path
	const result = await findEpisode(episodeId);
	if (!result) throw error(404, `Episode not found: ${episodeId}`);

	// Load the ORIGINAL episode file (not the aggregated/merged version)
	const original = await loadJsonLd(result.sourcePath);
	const pages = original['gh:pages'] as any[] ?? [];

	// Find source page and remove panel
	let movedPanel: any = null;
	for (const page of pages) {
		const pageNum = page['gh:pageNumber'];
		if (pageNum !== sourcePage) continue;

		const panels = page['gh:panels'] as any[] ?? [];
		const idx = panels.findIndex((p: any) => {
			const pi = p['gh:panelIndex'] ?? p['panel'];
			return pi === sourcePanel;
		});
		if (idx >= 0) {
			movedPanel = panels.splice(idx, 1)[0];
		}
		break;
	}

	if (!movedPanel) throw error(404, `Panel P${sourcePage}-${sourcePanel} not found`);

	// Find or create target page
	let targetPageObj = pages.find((p: any) => p['gh:pageNumber'] === targetPage);
	if (!targetPageObj) {
		targetPageObj = {
			'gh:pageNumber': targetPage,
			'gh:layout': 'full',
			'gh:panels': []
		};
		pages.push(targetPageObj);
		pages.sort((a: any, b: any) => (a['gh:pageNumber'] ?? 0) - (b['gh:pageNumber'] ?? 0));
	}

	// Insert panel at target position
	const targetPanels = targetPageObj['gh:panels'] as any[] ?? [];
	const insertAt = Math.min(targetPanelIndex ?? targetPanels.length, targetPanels.length);
	targetPanels.splice(insertAt, 0, movedPanel);
	targetPageObj['gh:panels'] = targetPanels;

	// Renumber panel indices on target page
	for (let i = 0; i < targetPanels.length; i++) {
		targetPanels[i]['gh:panelIndex'] = i + 1;
		if ('panel' in targetPanels[i]) targetPanels[i]['panel'] = i + 1;
	}

	// Remove empty pages
	original['gh:pages'] = pages.filter((p: any) => {
		const pnls = p['gh:panels'] as any[] ?? [];
		return pnls.length > 0;
	});

	// Save back to the same file (preserves original @context and all fields)
	await saveJsonLd(result.sourcePath, original);

	console.log(`[MovePanel] P${sourcePage}-${sourcePanel} → Page ${targetPage} (idx ${insertAt}) in ${episodeId}`);

	return json({
		success: true,
		message: `Panel moved to page ${targetPage}`
	});
};
