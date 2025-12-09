import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL = import.meta.env.VITE_GRAPHQL_API_URL || 'http://localhost:25325/graphql';

export const GET: RequestHandler = async ({ params }) => {
	const dialogueId = params.dialogueId;
	
	if (!dialogueId) {
		return json({ error: 'Dialogue ID is required' }, { status: 400 });
	}

	try {
		// Query GraphQL API to get audio data
		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
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

