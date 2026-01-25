/**
 * Character Asset API Endpoint (single asset)
 * Proxies character asset requests to grpc-go service
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
	const assetId = params.assetId;
	
	if (!assetId) {
		return json({ error: 'Asset ID is required' }, { status: 400 });
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
		const response = await callGrpcService('GetCharacterAssetData', { assetId }, headers);
		const data = await response.json();
		
		if (!data.assetData) {
			return json({ error: 'Asset not found' }, { status: 404 });
		}

		let assetData = data.assetData;
		// Remove data URL prefix if present (e.g., "data:image/png;base64,")
		if (typeof assetData === 'string' && assetData.includes(',')) {
			assetData = assetData.split(',')[1];
		}

		// Determine content type from asset format
		let contentType = 'application/octet-stream';
		if (data.assetType === 'image') {
			const format = (data.assetFormat || 'png').toLowerCase();
			if (format === 'jpeg' || format === 'jpg') {
				contentType = 'image/jpeg';
			} else if (format === 'png') {
				contentType = 'image/png';
			} else if (format === 'webp') {
				contentType = 'image/webp';
			} else {
				contentType = 'image/png';
			}
		} else if (data.assetType === 'audio') {
			const format = (data.assetFormat || 'mp3').toLowerCase();
			if (format === 'mp3') {
				contentType = 'audio/mpeg';
			} else if (format === 'wav') {
				contentType = 'audio/wav';
			} else if (format === 'ogg') {
				contentType = 'audio/ogg';
			} else {
				contentType = 'audio/mpeg';
			}
		}

		// Decode base64 asset data
		const assetBuffer = Buffer.from(assetData, 'base64');
		
		return new Response(assetBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				'Cross-Origin-Resource-Policy': 'cross-origin'
			},
		});
	} catch (error) {
		console.error('[Character Asset API] Error fetching asset:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch asset' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	const assetId = params.assetId;
	
	if (!assetId) {
		return json({ error: 'Asset ID is required' }, { status: 400 });
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
		const response = await callGrpcService('DeleteCharacterAsset', { assetId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Character Asset API] Error:', error);
		return json({ error: 'Failed to delete character asset' }, { status: 500 });
	}
};


