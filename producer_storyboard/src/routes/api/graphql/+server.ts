/**
 * GraphQL API Proxy Endpoint
 * Proxies requests to the GraphQL backend service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		
		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
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
