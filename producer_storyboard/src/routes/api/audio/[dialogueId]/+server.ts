import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Buffer } from 'buffer'; // Import Buffer for Node.js environment

// Use GraphQL API proxy instead of direct connection
function getGraphQLApiUrl(request: Request): string {
	if (process.env.VERCEL === '1') {
		const url = new URL(request.url);
		return `${url.origin}/api/graphql`;
	}
	return '/api/graphql';
}

export const GET: RequestHandler = async ({ params, request, cookies, locals }) => {
	const dialogueId = params.dialogueId;
	
	if (!dialogueId) {
		return json({ error: 'Dialogue ID is required' }, { status: 400 });
	}

	try {
		// Get auth from locals (set by withClerkHandler)
		const auth = locals.auth();
		
		// Prepare headers with authentication
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
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
		
		const graphqlApiUrl = getGraphQLApiUrl(request);
		
		// Query GraphQL API via proxy to get audio data
		const response = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDialogueAudio($dialogueId: ID!) {
						audioData(dialogueId: $dialogueId)
					}
				`,
				variables: {
					dialogueId,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`GraphQL API error: ${response.statusText}`);
		}

		const result = await response.json();
		
		if (result.errors) {
			throw new Error(result.errors[0].message);
		}

		const audioData = result.data?.audioData;
		if (!audioData) {
			return json({ error: 'Audio not found' }, { status: 404 });
		}

		// Decode base64 audio data
		const audioBuffer = Buffer.from(audioData, 'base64');
		
		// Default to MPEG format - adjust based on actual format stored
		return new Response(audioBuffer, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=31536000',
				// Add CORS headers for Web Audio API / Etro
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
