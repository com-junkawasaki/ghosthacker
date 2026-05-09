import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findEpisode, loadJsonLd, saveJsonLd } from '$lib/server/jsonld';

type DialogueInput = {
	speaker?: string;
	text?: string;
	type?: string;
};

function makePanelId(pageNumber: number, panels: any[]): string {
	const stamp = Date.now().toString(36);
	return `panel:p${pageNumber}n${panels.length + 1}-insert-${stamp}`;
}

function toDialogue(dialogue: DialogueInput[] | undefined): any[] {
	return (dialogue ?? [])
		.filter((d) => d.speaker || d.text)
		.map((d) => ({
			'gh:speaker': d.speaker ?? '',
			'gh:text': d.text ?? '',
			'gh:type': d.type ?? 'dialogue'
		}));
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const {
		episodeId,
		pageNumber,
		insertAt,
		afterPanel,
		panelData = {},
		revision = 'manual-insert'
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		insertAt?: number;
		afterPanel?: number;
		panelData?: {
			visual?: string;
			dialogue?: DialogueInput[];
			imagePrompt?: string;
			sdxlPrompt?: string;
			shot?: string;
			environment?: string;
			characters?: string[];
		};
		revision?: string;
	};

	if (!episodeId || pageNumber == null) {
		throw error(400, 'episodeId and pageNumber required');
	}

	const result = await findEpisode(episodeId);
	if (!result) throw error(404, `Episode not found: ${episodeId}`);

	const original = await loadJsonLd(result.sourcePath);
	const pages = original['gh:pages'] as any[] ?? [];
	let page = pages.find((p: any) => p['gh:pageNumber'] === pageNumber);

	if (!page) {
		page = {
			'gh:pageNumber': pageNumber,
			'gh:pageTitle': `Page ${pageNumber}`,
			'gh:panels': []
		};
		pages.push(page);
		pages.sort((a: any, b: any) => (a['gh:pageNumber'] ?? 0) - (b['gh:pageNumber'] ?? 0));
	}

	const panels = page['gh:panels'] as any[] ?? [];
	let targetIndex = Number.isInteger(insertAt) ? Number(insertAt) : panels.length;
	if (afterPanel != null) {
		const afterIndex = panels.findIndex((p: any) => {
			const pi = p['gh:panelIndex'] ?? p['panel'];
			return pi === afterPanel || pi === afterPanel + 1;
		});
		if (afterIndex >= 0) targetIndex = afterIndex + 1;
	}
	targetIndex = Math.max(0, Math.min(targetIndex, panels.length));

	const visual = panelData.visual ?? '';
	const imagePrompt = panelData.imagePrompt ?? visual;
	const panel = {
		'@id': makePanelId(pageNumber, panels),
		'@type': 'gh:Panel',
		panel: targetIndex + 1,
		'gh:panelIndex': targetIndex + 1,
		'gh:inserted': true,
		'gh:insertedAt': new Date().toISOString(),
		'gh:insertedRevision': revision,
		visual,
		'gh:visual': visual,
		dialogue: panelData.dialogue ?? [],
		'gh:dialogue': toDialogue(panelData.dialogue),
		'gh:imagePrompt': imagePrompt,
		'gh:sdxlPrompt': panelData.sdxlPrompt ?? imagePrompt,
		...(panelData.shot ? { shot: panelData.shot, 'gh:shot': panelData.shot } : {}),
		...(panelData.environment ? { environment: panelData.environment, 'gh:environment': panelData.environment } : {}),
		...(panelData.characters ? { characters: panelData.characters, 'gh:characters': panelData.characters } : {}),
		'gh:generatedImages': [],
		'gh:currentImageIndex': -1
	};

	panels.splice(targetIndex, 0, panel);
	for (let i = 0; i < panels.length; i++) {
		panels[i]['gh:panelIndex'] = i + 1;
		panels[i].panel = i + 1;
	}
	page['gh:panels'] = panels;
	page['gh:panelCount'] = panels.length;
	original['gh:pages'] = pages;

	await saveJsonLd(result.sourcePath, original);

	return json({
		success: true,
		pageNumber,
		insertedAt: targetIndex,
		panel
	});
};
