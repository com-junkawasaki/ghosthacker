/**
 * Scenes API Endpoint
 * Proxies scene-related requests to grpc-go service
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
	const storyboardId = url.searchParams.get('storyboardId');
	if (!storyboardId) {
		return json({ error: 'storyboardId is required' }, { status: 400 });
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
		const response = await callGrpcService('ListScenes', { storyboardId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Scenes API] Error:', error);
		return json({ error: 'Failed to fetch scenes' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { storyboardId, sceneNumber, textDescription, durationSeconds, startTimeSeconds, transitionType } = body;
	
	if (!storyboardId || sceneNumber === undefined) {
		return json({ error: 'storyboardId and sceneNumber are required' }, { status: 400 });
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
			'CreateScene',
			{ storyboardId, sceneNumber, textDescription, durationSeconds, startTimeSeconds, transitionType },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Scenes API] Error:', error);
		return json({ error: 'Failed to create scene' }, { status: 500 });
	}
};
