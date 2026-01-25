import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getBoard, saveNode, syncLinks, initializeFromJSONLD } from '$lib/server/jsonld';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const load: PageServerLoad = async () => {
	try {
		const board = await getBoard();
		return { board };
	} catch (e) {
		console.error(e);
		throw error(500, `Data Load Error: ${String(e)}`);
	}
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const layoutStr = form.get('layout');
		if (typeof layoutStr !== 'string') return fail(400);

		if (layoutStr === 'RESET_DB') {
			const jsonPath = resolve(process.cwd(), 'data/presentation.jsonld');
			const text = await readFile(jsonPath, 'utf8');
			const data = JSON.parse(text);
			await initializeFromJSONLD(data);
			return { success: true };
		}

		try {
			const layout = JSON.parse(layoutStr);
			
			// 1. ノードの保存
			for (const node of layout.nodes) {
				await saveNode(node.id, node.x, node.y, !!node.fixed, node.scale || 1, node.name, node.nodeType);
			}

			// 2. リンクの同期
			if (Array.isArray(layout.links)) {
				await syncLinks(layout.links);
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { message: String(e) });
		}
	}
};
