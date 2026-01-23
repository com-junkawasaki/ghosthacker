import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StoryboardService } from '$lib/gen/proto/storyboard_connect';

const transport = createConnectTransport({
	baseUrl: window.location.origin.replace(':1421', ':8081'),
});

// @ts-ignore - ConnectRPC type definitions
export const storyboardClient = createClient(StoryboardService, transport);
