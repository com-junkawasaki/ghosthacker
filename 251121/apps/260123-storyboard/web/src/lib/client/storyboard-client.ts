import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StoryboardService } from '$lib/gen/proto/storyboard_pb';
import type { GetEpisodesResponse, GetEpisodePanelsResponse } from '$lib/gen/proto/storyboard_pb';

// Determine API base URL
const getApiBaseUrl = (): string => {
	if (typeof window === 'undefined') {
		return 'http://localhost:8081';
	}
	// In development, frontend runs on 1421, backend on 8081
	if (window.location.port === '1421' || window.location.hostname === 'localhost') {
		return 'http://localhost:8081';
	}
	// In production, use same origin
	return window.location.origin;
};

const transport = createConnectTransport({
	baseUrl: getApiBaseUrl(),
});

export const storyboardClient = createClient(StoryboardService, transport);

/**
 * Type-safe wrapper for getEpisodes with runtime validation
 */
export async function getEpisodes(filePath: string = ''): Promise<GetEpisodesResponse['episodes']> {
	const response = await storyboardClient.getEpisodes({ filePath });
	
	// Runtime validation
	if (!response || typeof response !== 'object') {
		throw new Error('Invalid response: response is not an object');
	}
	
	if (!('episodes' in response)) {
		throw new Error('Invalid response: missing episodes field');
	}
	
	if (!Array.isArray(response.episodes)) {
		throw new Error(`Invalid response: episodes is not an array, got ${typeof response.episodes}`);
	}
	
	return response.episodes;
}

/**
 * Type-safe wrapper for getEpisodePanels with runtime validation
 */
export async function getEpisodePanels(
	filePath: string,
	episodeId: string,
	pageNumber: number
): Promise<GetEpisodePanelsResponse['panels']> {
	const response = await storyboardClient.getEpisodePanels({
		filePath,
		episodeId,
		pageNumber
	});
	
	// Runtime validation
	if (!response || typeof response !== 'object') {
		throw new Error('Invalid response: response is not an object');
	}
	
	if (!('panels' in response)) {
		throw new Error('Invalid response: missing panels field');
	}
	
	if (!Array.isArray(response.panels)) {
		throw new Error(`Invalid response: panels is not an array, got ${typeof response.panels}`);
	}
	
	return response.panels;
}
