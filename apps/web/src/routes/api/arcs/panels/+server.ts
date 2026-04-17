import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getArcPanels } from '$lib/server/jsonld';

export const GET: RequestHandler = async ({ url }) => {
	const arcId = url.searchParams.get('arcId');
	if (!arcId) throw error(400, 'Missing arcId');
	return json({ panels: await getArcPanels(arcId) });
};
