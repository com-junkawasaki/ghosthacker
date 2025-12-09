import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Buffer } from 'buffer'; // Import Buffer for Node.js environment

const GRAPHQL_API_URL = import.meta.env.GRAPHQL_API_URL || process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';

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

		// Get image format from a separate query
		const formatResponse = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `
					query GetImageFormat($imageId: ID!) {
						generatedImages(sceneId: $imageId) {
							imageFormat
						}
					}
				`,
				variables: {
					imageId,
				},
			}),
		});

		let contentType = 'image/png';
		if (formatResponse.ok) {
			const formatResult = await formatResponse.json();
			const format = formatResult.data?.generatedImages?.[0]?.imageFormat;
			if (format === 'jpeg' || format === 'jpg') {
				contentType = 'image/jpeg';
			} else if (format === 'png') {
				contentType = 'image/png';
			}
		}

		// Decode base64 image data
		const imageBuffer = Buffer.from(imageData, 'base64');
		
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				// Add CORS headers for Canvas use (Etro/ffmpeg.wasm)
				'Access-Control-Allow-Origin': '*',
				'Cross-Origin-Resource-Policy': 'cross-origin'
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
