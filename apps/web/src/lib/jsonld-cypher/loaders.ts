/**
 * Convenience loaders that fetch JSON-LD from the backend
 * and return a queryable GraphStore.
 */

import { GraphStore } from './graph-store';
import { loadStoryboard } from '$lib/client/storyboard-client';

/**
 * Load the aggregated episode JSON-LD from the backend
 * and build an in-memory graph.
 */
export async function loadEpisodeGraph(
	storyboardPath: string,
	lang: 'ja' | 'en' = 'ja',
): Promise<GraphStore> {
	const response = await loadStoryboard(storyboardPath);
	const jsonld = JSON.parse(response.jsonldContent || '{}') as Record<string, unknown>;
	return GraphStore.fromJsonLd(jsonld, lang);
}
