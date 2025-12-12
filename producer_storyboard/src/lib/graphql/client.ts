import { HoudiniClient } from '$houdini';
import { browser } from '$app/environment';

// IMPORTANT: Always use the SvelteKit proxy for GraphQL requests
// This ensures:
// 1. X-User-Id header is set from Clerk session (via +server.ts)
// 2. X-Org-Id header is forwarded correctly
// 3. CORS issues are avoided
// 
// SSR時も/api/graphqlプロキシを経由する必要があります（X-User-Id送信のため）
// Note: In SSR, we need to use an absolute URL to the local server
const graphqlApiUrl = browser
	? (import.meta.env.PUBLIC_GRAPHQL_API_URL || '/api/graphql')
	: 'http://localhost:5173/api/graphql';

if (browser) {
	console.log('[GraphQL Client] Initializing with URL:', graphqlApiUrl);
	console.log('[GraphQL Client] Environment:', {
		PUBLIC_GRAPHQL_API_URL: import.meta.env.PUBLIC_GRAPHQL_API_URL,
		GRAPHQL_API_URL: import.meta.env.GRAPHQL_API_URL,
		browser,
	});
	console.log('[GraphQL Client] Final URL:', graphqlApiUrl);
}

// Custom fetch with timeout
// Image generation can take 30-60 seconds, so use longer timeout
const fetchWithTimeout = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const controller = new AbortController();
	// Check if this is an image generation request (longer timeout)
	const isImageGeneration = typeof init?.body === 'string' && init.body.includes('generateSceneImage');
	const timeoutMs = isImageGeneration ? 120000 : 30000; // 120 seconds for image generation, 30 seconds for others
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Request timeout');
		}
		throw error;
	}
};

const client = new HoudiniClient({
	url: graphqlApiUrl,
	fetchParams({ session, metadata }) {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
		// DEBUG: Log on both SSR and client
		console.log(`[GraphQL Client] fetchParams called - browser: ${browser}, metadata:`, metadata);
		
		// 1. First priority: Use orgId from metadata (passed from SSR load function)
		// This ensures correct orgId is used in both SSR and client-side
		if (metadata?.orgId) {
			headers['X-Org-Id'] = metadata.orgId;
			console.log(`[GraphQL Client] Using orgId from metadata: ${metadata.orgId}`);
		}
		// 2. Fallback: Extract orgId from URL params (client-side only)
		else if (browser) {
			try {
				const currentPath = window.location.pathname;
				const orgIdMatch = currentPath.match(/\/orgs\/([^/]+)/);
				if (orgIdMatch && orgIdMatch[1]) {
					headers['X-Org-Id'] = orgIdMatch[1];
					console.log(`[GraphQL Client] Using orgId from URL: ${orgIdMatch[1]}`);
				}
			} catch (e) {
				console.warn('[GraphQL Client] Could not extract orgId from URL:', e);
			}
		} else {
			console.warn('[GraphQL Client] SSR mode but no metadata.orgId provided!');
		}
		
		// Clerk authentication is handled by the API proxy (/api/graphql/+server.ts)
		// The proxy forwards Clerk session tokens from cookies/headers to the backend
		
		console.log('[GraphQL Client] Final headers:', headers);
		
		return {
			headers,
		};
	},
	throwOnError: {
		operations: ['all'],
	},
	// @ts-expect-error - fetch property may not be in type definition but is supported by Houdini
	fetch: fetchWithTimeout,
});

if (browser) {
	// Intercept globalThis.fetch for debugging and timeout (Houdini uses this internally)
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async function (...args) {
		const [url, init] = args;
		const requestInfo = {
			url: typeof url === 'string' ? url : url.toString(),
			method: init?.method || 'GET',
			headers: init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {},
			body: init?.body,
			timestamp: Date.now(),
		};

		// Only log GraphQL requests
		if (requestInfo.url.includes('/graphql')) {
			console.log('[GraphQL Client] Fetch request:', requestInfo);
		}

		// Add timeout for GraphQL requests
		const isGraphQLRequest = requestInfo.url.includes('/graphql');
		const controller = new AbortController();
		// Check if this is an image generation request (longer timeout)
		const isImageGeneration = typeof requestInfo.body === 'string' && requestInfo.body.includes('generateSceneImage');
		const timeoutMs = isImageGeneration ? 120000 : 30000; // 120 seconds for image generation, 30 seconds for others
		const timeoutId = isGraphQLRequest 
			? setTimeout(() => {
				console.warn('[GraphQL Client] Request timeout:', requestInfo.url);
				controller.abort();
			}, timeoutMs)
			: null;

		try {
			// Merge abort signal if timeout is set
			// Note: AbortSignal.any() is not available in all browsers, so we use the timeout signal directly
			// If init already has a signal, we create a new controller that aborts when either signal aborts
			let finalSignal = controller.signal;
			if (timeoutId && init?.signal) {
				// If both signals exist, create a combined controller
				const combinedController = new AbortController();
				controller.signal.addEventListener('abort', () => combinedController.abort());
				init.signal.addEventListener('abort', () => combinedController.abort());
				finalSignal = combinedController.signal;
			}
			const fetchInit = timeoutId 
				? { ...init, signal: finalSignal }
				: init;

			const response = await originalFetch.apply(this, [url, fetchInit]);
			
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			
			// Only log GraphQL responses
			if (isGraphQLRequest) {
				const clonedResponse = response.clone();
				
				const responseInfo: {
					url: string;
					status: number;
					statusText: string;
					headers: Record<string, string>;
					timestamp: number;
					body?: unknown;
					bodyError?: string;
				} = {
					url: requestInfo.url,
					status: response.status,
					statusText: response.statusText,
					headers: Object.fromEntries(response.headers.entries()),
					timestamp: Date.now(),
				};

				// Try to read body
				try {
					const contentType = response.headers.get('content-type');
					if (contentType?.includes('application/json')) {
						const data = await clonedResponse.json();
						responseInfo.body = data;
						console.log('[GraphQL Client] Response data:', data);
					} else {
						const text = await clonedResponse.text();
						responseInfo.body = text.substring(0, 500);
						console.log('[GraphQL Client] Response text:', text.substring(0, 500));
					}
				} catch (e) {
					responseInfo.bodyError = String(e);
					console.error('[GraphQL Client] Failed to parse response:', e);
				}

				console.log('[GraphQL Client] Fetch response:', responseInfo);
			}
			
			return response;
		} catch (error) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			if (isGraphQLRequest) {
				if (error instanceof Error && error.name === 'AbortError') {
					console.error('[GraphQL Client] Request timeout:', requestInfo.url);
					throw new Error(`GraphQL request timeout: ${requestInfo.url}`);
				}
				console.error('[GraphQL Client] Fetch error:', error);
			}
			throw error;
		}
	};
}

export default client;
