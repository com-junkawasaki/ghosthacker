import { HoudiniClient } from '$houdini';
import { browser } from '$app/environment';

// Use relative URL for browser to avoid CORS/Mixed Content issues
const graphqlApiUrl = browser
	? (import.meta.env.PUBLIC_GRAPHQL_API_URL || '/api/graphql')
	: (import.meta.env.GRAPHQL_API_URL || 'http://graphql:8080/graphql');

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
const fetchWithTimeout = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
	fetchParams({ session }) {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
		if (browser) {
			console.log('[GraphQL Client] Fetch params:', { session, headers });
		}
		
		return {
			headers,
		};
	},
	throwOnError: {
		operations: ['all'],
	},
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
		const timeoutId = isGraphQLRequest 
			? setTimeout(() => {
				console.warn('[GraphQL Client] Request timeout:', requestInfo.url);
				controller.abort();
			}, 10000) // 10 second timeout
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
