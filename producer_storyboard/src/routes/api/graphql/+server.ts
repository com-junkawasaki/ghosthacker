/**
 * GraphQL API Proxy Endpoint
 * Proxies requests to the GraphQL backend service
 * Forwards Clerk authentication headers to the backend
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use Vercel Rust runtime endpoint in production, fallback to localhost for development
function getGraphQLApiUrl(request: Request): string {
	if (process.env.VERCEL === '1') {
		// In Vercel, use the Rust runtime endpoint
		// Use relative path to access the Rust serverless function
		// The Rust function is deployed at /api/graphql-rust
		const url = new URL(request.url);
		return `${url.origin}/api/graphql-rust`;
	}
	return process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
}

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	// Get GraphQL API URL (Vercel Rust runtime in production, localhost in development)
	const graphqlApiUrl = getGraphQLApiUrl(request);
	
	// Check if GRAPHQL_API_URL is configured (not localhost in production)
	const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
	const isLocalhost = graphqlApiUrl.includes('localhost') || graphqlApiUrl.includes('127.0.0.1');
	
	if (isProduction && isLocalhost && !graphqlApiUrl.includes('/api/graphql-rust')) {
		console.error('[GraphQL Proxy] GRAPHQL_API_URL is not configured for production');
		return json(
			{
				error: 'GraphQL API is not configured',
				message: 'GRAPHQL_API_URL environment variable must be set in production. Please deploy the GraphQL backend service and configure the URL.',
			},
			{ status: 503 }
		);
	}

	try {
		const body = await request.json();
		
		// Get auth from locals (set by withClerkHandler)
		const auth = locals.auth();
		
		// Forward Clerk session token and org ID from request headers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
		// Forward Authorization header if present (Clerk session token)
		const authHeader = request.headers.get('authorization');
		if (authHeader) {
			headers['Authorization'] = authHeader;
		}
		
		// Forward org ID header if present, or use from auth locals
		const orgId = request.headers.get('x-org-id') || auth.orgId;
		if (orgId) {
			headers['X-Org-Id'] = orgId;
		}
		
		// Forward user ID from auth locals (required for require_auth_and_org)
		if (auth.userId) {
			headers['X-User-Id'] = auth.userId;
		}
		
		// Also check for Clerk session cookie
		const clerkSession = cookies.get('__session');
		if (clerkSession) {
			headers['X-Clerk-Session'] = clerkSession;
		}
		
		const response = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			console.error('[GraphQL Proxy] API error:', {
				status: response.status,
				statusText: response.statusText,
				url: graphqlApiUrl,
				error: errorText,
			});
			return json(
				{ error: `GraphQL API error: ${response.statusText}`, details: errorText },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json(data);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorCode = error instanceof Error && 'code' in error ? error.code : undefined;
		
		console.error('[GraphQL Proxy] Error:', {
			message: errorMessage,
			code: errorCode,
			url: graphqlApiUrl,
			error: error,
		});

		// Provide more specific error messages
		if (errorCode === 'ECONNREFUSED') {
			return json(
				{
					error: 'Cannot connect to GraphQL API',
					message: `Failed to connect to ${graphqlApiUrl}. Please ensure the GraphQL backend service is running and GRAPHQL_API_URL is correctly configured.`,
					url: graphqlApiUrl,
				},
				{ status: 503 }
			);
		}

		return json(
			{
				error: errorMessage,
				url: graphqlApiUrl,
			},
			{ status: 500 }
		);
	}
};
