/**
 * Reorder Parts API Endpoint
 * Reorders parts within an episode
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRPC_API_URL = process.env.GRPC_API_URL || 'http://localhost:25326';

async function callGrpcService(
	method: string,
	requestBody: Record<string, unknown>,
	headers: Record<string, string>
): Promise<Response> {
	const url = `${GRPC_API_URL}/storyboard.v1.StoryboardService/${method}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: JSON.stringify(requestBody),
	});

	return response;
}

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { episodeId, partIds } = body;

	if (!episodeId || !partIds || !Array.isArray(partIds)) {
		return json({ error: 'episodeId and partIds array are required' }, { status: 400 });
	}

	const auth = locals.auth();
	const headers: Record<string, string> = {};

	if (auth.orgId) {
		headers['X-Org-Id'] = auth.orgId;
	}
	if (auth.userId) {
		headers['X-User-Id'] = auth.userId;
	}

	const sessionToken = cookies.get('__session');
	if (sessionToken) {
		headers['Authorization'] = `Bearer ${sessionToken}`;
		headers['X-Clerk-Session'] = sessionToken;
	}

	try {
		const response = await callGrpcService(
			'ReorderParts',
			{ episodeId, partIds },
			headers
		);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[Reorder Parts API] gRPC error:', response.status, errorText);
			return json({ error: `Failed to reorder parts: ${response.statusText}`, details: errorText }, { status: response.status });
		}
		
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Reorder Parts API] Error:', error);
		return json({ error: 'Failed to reorder parts' }, { status: 500 });
	}
};
