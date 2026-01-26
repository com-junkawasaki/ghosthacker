/**
 * Dialogue Audio API Endpoint
 * Proxies dialogue audio requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Buffer } from 'buffer';

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

export const GET: RequestHandler = async ({ params, request, cookies, locals }) => {
	const dialogueId = params.dialogueId;
	
	if (!dialogueId) {
		return json({ error: 'Dialogue ID is required' }, { status: 400 });
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
		const response = await callGrpcService('GetDialogueAudioData', { dialogueId }, headers);
		const data = await response.json();
		
		if (!data.audioData) {
			return json({ error: 'Audio not found' }, { status: 404 });
		}

		let audioData = data.audioData;
		// Remove data URL prefix if present
		if (typeof audioData === 'string' && audioData.includes(',')) {
			audioData = audioData.split(',')[1];
		}

		// Decode base64 audio data
		const audioBuffer = Buffer.from(audioData, 'base64');
		
		// Default to MPEG format
		return new Response(audioBuffer, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				'Cross-Origin-Resource-Policy': 'cross-origin'
			},
		});
	} catch (error) {
		console.error('[Audio API] Error fetching audio:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch audio' },
			{ status: 500 }
		);
	}
};
