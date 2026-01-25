/**
 * Dialogue API Endpoint (single dialogue)
 * Proxies dialogue CRUD requests to grpc-go service
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

export const GET: RequestHandler = async ({ params, cookies, locals }) => {
	const { dialogueId } = params;
	
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
		const response = await callGrpcService('GetDialogue', { id: dialogueId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Dialogue API] Error:', error);
		return json({ error: 'Failed to fetch dialogue' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, cookies, locals }) => {
	const { dialogueId } = params;
	const body = await request.json();
	const { language, text, humeVoiceId, emotionName, emotionX, emotionY } = body;
	
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
			'UpdateDialogue',
			{ id: dialogueId, language, text, humeVoiceId, emotionName, emotionX, emotionY },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Dialogue API] Error:', error);
		return json({ error: 'Failed to update dialogue' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	const { dialogueId } = params;
	
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
		const response = await callGrpcService('DeleteDialogue', { id: dialogueId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Dialogue API] Error:', error);
		return json({ error: 'Failed to delete dialogue' }, { status: 500 });
	}
};

