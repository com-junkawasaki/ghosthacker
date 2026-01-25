/**
 * Tags API Endpoint
 * Proxies tag-related requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRPC_API_URL = process.env.GRPC_API_URL || 'http://localhost:25326';

async function callGrpcService(
	method: string,
	requestBody: any,
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

export const GET: RequestHandler = async ({ request, url, cookies, locals }) => {
	const projectId = url.searchParams.get('projectId');
	if (!projectId) {
		return json({ error: 'projectId is required' }, { status: 400 });
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
		const response = await callGrpcService('ListTags', { projectId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Tags API] Error:', error);
		return json({ error: 'Failed to fetch tags' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { projectId, name, color } = body;
	
	if (!projectId || !name) {
		return json({ error: 'projectId and name are required' }, { status: 400 });
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
			'CreateTag',
			{ projectId, name, color },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Tags API] Error:', error);
		return json({ error: 'Failed to create tag' }, { status: 500 });
	}
};
