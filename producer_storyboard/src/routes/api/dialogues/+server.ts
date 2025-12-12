/**
 * Dialogues API Endpoint
 * Proxies dialogue-related requests to grpc-go service
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
	const sceneId = url.searchParams.get('sceneId');
	if (!sceneId) {
		return json({ error: 'sceneId is required' }, { status: 400 });
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
		const response = await callGrpcService('ListDialogues', { sceneId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Dialogues API] Error:', error);
		return json({ error: 'Failed to fetch dialogues' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { sceneId, characterId, language, text, humeVoiceId } = body;
	
	if (!sceneId || !characterId || !language || !text) {
		return json({ error: 'sceneId, characterId, language, and text are required' }, { status: 400 });
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
			'CreateDialogue',
			{ sceneId, characterId, language, text, humeVoiceId },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Dialogues API] Error:', error);
		return json({ error: 'Failed to create dialogue' }, { status: 500 });
	}
};
