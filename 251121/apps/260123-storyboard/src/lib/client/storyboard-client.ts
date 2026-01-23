import { createPromiseClient } from '@connectrpc/connect-web';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StoryboardService } from '$lib/gen/proto/storyboard_connect';

const transport = createConnectTransport({
	baseUrl: window.location.origin.replace(':1421', ':8081'),
});

export const storyboardClient = createPromiseClient(StoryboardService, transport);
