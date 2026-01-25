/**
 * Composers Tracks API Endpoint
 * Proxies audio track requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Use grpc-go service endpoint
const GRPC_API_URL = env.GRPC_API_URL || process.env.GRPC_API_URL || 'http://grpc-go:8081';

async function callGrpcService(
	method: string,
	requestBody: any,
	headers: Record<string, string>
): Promise<Response> {
	// Construct the Connect endpoint URL (Connect RPC requires leading slash)
	const connectPath = `/storyboard.v1.StoryboardService/${method}`;
	const url = `${GRPC_API_URL}${connectPath}`;
	
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: JSON.stringify(requestBody),
	});
	
	if (!response.ok) {
		const responseText = await response.text().catch(() => '');
		console.error('[Composers Tracks API] gRPC service error:', {
			status: response.status,
			statusText: response.statusText,
			method,
			url,
			responseText: responseText.substring(0, 500),
		});
	}
	
	return response;
}

export const GET: RequestHandler = async ({ params, cookies, locals }) => {
	const composerId = params.composerId;
	if (!composerId) {
		return json({ error: 'composerId is required' }, { status: 400 });
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
		const response = await callGrpcService('ListAudioTracks', { composerId }, headers);
		
		if (!response.ok) {
			return json(
				{ error: `Failed to fetch tracks: ${response.statusText}` },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Composers Tracks API] Error:', error);
		return json(
			{ 
				error: 'Failed to fetch tracks',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ params, request, cookies, locals }) => {
	const composerId = params.composerId;
	if (!composerId) {
		return json({ error: 'composerId is required' }, { status: 400 });
	}
	
	const body = await request.json();
	const { trackNumber, trackType, name } = body;
	
	if (!trackNumber || !trackType) {
		return json({ error: 'trackNumber and trackType are required' }, { status: 400 });
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
			'CreateAudioTrack',
			{ composerId, trackNumber, trackType, name },
			headers
		);
		
		if (!response.ok) {
			return json(
				{ error: `Failed to create track: ${response.statusText}` },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Composers Tracks API] Error:', error);
		return json(
			{ 
				error: 'Failed to create track',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
};
