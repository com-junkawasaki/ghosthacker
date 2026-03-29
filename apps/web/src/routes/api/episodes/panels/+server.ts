import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getEpisodePanels } from '$lib/server/jsonld';

export const GET: RequestHandler = async ({ url }) => {
	const episodeId = url.searchParams.get('episodeId');
	if (!episodeId) throw error(400, 'Missing episodeId');
	return json({ panels: await getEpisodePanels(episodeId) });
};
