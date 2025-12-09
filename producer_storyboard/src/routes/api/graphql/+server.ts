/**
 * GraphQL API Proxy Endpoint
 * Proxies requests to the GraphQL backend service
 * Forwards Clerk authentication headers to the backend
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		
		// Forward Clerk session token and org ID from request headers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
		// Forward Authorization header if present (Clerk session token)
		const authHeader = request.headers.get('authorization');
		if (authHeader) {
			headers['Authorization'] = authHeader;
		}
		
		// Forward org ID header if present
		const orgId = request.headers.get('x-org-id');
		if (orgId) {
			headers['X-Org-Id'] = orgId;
		}
		
		// Also check for Clerk session cookie
		const clerkSession = cookies.get('__session');
		if (clerkSession) {
			headers['X-Clerk-Session'] = clerkSession;
		}
		
		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			return json(
				{ error: `GraphQL API error: ${response.statusText}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[GraphQL Proxy] Error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
