/**
 * Generated Image API Endpoint
 * Proxies image requests to grpc-go service
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
	const imageId = params.imageId;
	
	if (!imageId) {
		return json({ error: 'Image ID is required' }, { status: 400 });
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
		const response = await callGrpcService('GetImageData', { imageId }, headers);
		const data = await response.json();
		
		if (!data.imageData) {
			return json({ error: 'Image not found' }, { status: 404 });
		}

		let imageData = data.imageData;
		// Remove data URL prefix if present
		if (typeof imageData === 'string' && imageData.includes(',')) {
			imageData = imageData.split(',')[1];
		}

		// Determine content type from image format
		let contentType = 'image/png';
		const format = (data.imageFormat || 'png').toLowerCase();
		if (format === 'jpeg' || format === 'jpg') {
			contentType = 'image/jpeg';
		} else if (format === 'png') {
			contentType = 'image/png';
		} else if (format === 'webp') {
			contentType = 'image/webp';
		}

		// Decode base64 image data
		const imageBuffer = Buffer.from(imageData, 'base64');
		
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
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
