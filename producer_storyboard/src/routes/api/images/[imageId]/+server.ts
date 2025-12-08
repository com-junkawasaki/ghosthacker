import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GRAPHQL_API_URL = import.meta.env.VITE_GRAPHQL_API_URL || 'http://localhost:25325/graphql';

export const GET: RequestHandler = async ({ params }) => {
	const imageId = params.imageId;
	
	if (!imageId) {
		return json({ error: 'Image ID is required' }, { status: 400 });
	}

	try {
		// Query GraphQL API to get image data
		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `
					query GetImageData($imageId: ID!) {
						imageData(imageId: $imageId)
					}
				`,
				variables: {
					imageId,
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

		const imageData = result.data?.imageData;
		if (!imageData) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		// Decode base64 image data
		const imageBuffer = Buffer.from(imageData, 'base64');
		
		// Determine content type from image format (we'll need to query this)
		// For now, default to PNG
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=31536000',
			},
		});
	} catch (error) {
		console.error('[Image API] Error fetching image:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch image' },
			{ status: 500 }
		);
	}
};

