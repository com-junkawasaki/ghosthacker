/**
 * Connect-Web gRPC Client for Manga Service
 * Client for calling manga grpc-go service via Connect protocol
 */
import { browser } from '$app/environment';
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { MangaService } from './generated/manga/v1/manga_service_pb';

// Get gRPC API URL
const grpcApiUrl = browser
	? (import.meta.env.PUBLIC_GRPC_API_URL || '/api/grpc')
	: 'http://localhost:5173/api/grpc';

// Create Connect transport
const transport = createConnectTransport({
	baseUrl: grpcApiUrl,
	fetch: async (input, init) => {
		// Extract orgId from URL or metadata
		const url = typeof input === 'string' ? new URL(input, window.location.origin) : new URL(input instanceof Request ? input.url : input);
		const orgId = url.searchParams.get('orgId') || extractOrgIdFromPath();
		
		const headers = new Headers(init?.headers);
		
		if (orgId) {
			headers.set('X-Org-Id', orgId);
		}
		
		// Forward Clerk session if available
		const sessionToken = document.cookie
			.split('; ')
			.find(row => row.startsWith('__session='))
			?.split('=')[1];
		
		if (sessionToken) {
			headers.set('Authorization', `Bearer ${sessionToken}`);
			headers.set('X-Clerk-Session', sessionToken);
		}
		
		return fetch(input, {
			...init,
			headers,
		});
	},
});

// Extract orgId from current URL path
function extractOrgIdFromPath(): string | null {
	if (!browser) return null;
	try {
		const path = window.location.pathname;
		const match = path.match(/\/orgs\/([^/]+)/);
		return match ? match[1] ?? null : null;
	} catch {
		return null;
	}
}

// Create client
export const mangaClient = createClient(MangaService, transport);
