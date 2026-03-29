import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { updatePanel } from '$lib/server/jsonld';

export const POST: RequestHandler = async ({ request }) => {
	const { episodeId, pageNumber, panel, panelData } = await request.json();
	if (!episodeId || pageNumber == null || panel == null) throw error(400, 'Missing required fields');
	await updatePanel(episodeId, pageNumber, panel, panelData);
	return json({ success: true });
};
