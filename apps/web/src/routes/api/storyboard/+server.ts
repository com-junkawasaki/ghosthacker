import { json } from '@sveltejs/kit';
import { loadAggregatedStoryboard } from '$lib/server/jsonld';

export const GET = async () => {
	const data = await loadAggregatedStoryboard();
	return json({ jsonldContent: JSON.stringify(data) });
};
