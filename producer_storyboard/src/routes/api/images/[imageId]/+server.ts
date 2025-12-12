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
	const imageId = params.imageId;
	
	if (!imageId) {
		return json({ error: 'Image ID is required' }, { status: 400 });
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
		
		// Query GraphQL API via proxy to get image data
		const response = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
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

		let imageData = result.data?.imageData;
		if (!imageData) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		// Remove data URL prefix if present (e.g., "data:image/png;base64,")
		if (typeof imageData === 'string' && imageData.includes(',')) {
			imageData = imageData.split(',')[1];
		}

		// Get image format from a separate query
		const formatResponse = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
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
			} else if (format === 'webp') {
				contentType = 'image/webp';
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
