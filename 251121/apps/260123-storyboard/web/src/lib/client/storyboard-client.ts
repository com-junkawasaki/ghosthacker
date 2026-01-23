import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StoryboardService } from '$lib/gen/proto/storyboard_pb';

// Determine API base URL
const getApiBaseUrl = () => {
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
