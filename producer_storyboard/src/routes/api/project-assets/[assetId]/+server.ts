/**
 * Project Asset API Endpoint (individual asset operations)
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

export const GET: RequestHandler = async ({ params, url, cookies, locals }) => {
	const { assetId } = params;
	const dataOnly = url.searchParams.get('data') === 'true';
	
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
		if (dataOnly) {
			// Get asset data and metadata
			const [dataResponse, assetResponse] = await Promise.all([
				callGrpcService('GetProjectAssetData', { assetId }, headers),
				callGrpcService('GetProjectAsset', { id: assetId }, headers)
			]);
			
			const data = await dataResponse.json();
			const asset = await assetResponse.json();
			
			if (!data.assetDataBase64) {
				return json({ error: 'Asset not found' }, { status: 404 });
			}

			let assetData = data.assetDataBase64;
			// Remove data URL prefix if present (e.g., "data:image/png;base64,")
			if (typeof assetData === 'string' && assetData.includes(',')) {
				assetData = assetData.split(',')[1];
			}

			// Determine content type from asset format
			let contentType = 'application/octet-stream';
			const assetType = asset.assetType || 'document';
			const format = (data.assetFormat || asset.assetFormat || 'png').toLowerCase();
			
			if (assetType === 'image') {
				if (format === 'jpeg' || format === 'jpg') {
					contentType = 'image/jpeg';
				} else if (format === 'png') {
					contentType = 'image/png';
				} else if (format === 'webp') {
					contentType = 'image/webp';
				} else if (format === 'gif') {
					contentType = 'image/gif';
				} else {
					contentType = 'image/png';
				}
			} else if (assetType === 'video') {
				if (format === 'mp4') {
					contentType = 'video/mp4';
				} else if (format === 'webm') {
					contentType = 'video/webm';
				} else if (format === 'mov') {
					contentType = 'video/quicktime';
				} else {
					contentType = 'video/mp4';
				}
			} else if (assetType === 'audio') {
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
		} else {
			const response = await callGrpcService('GetProjectAsset', { id: assetId }, headers);
			const data = await response.json();
			return json(data);
		}
	} catch (error) {
		console.error('[Project Asset API] Error:', error);
		return json({ error: 'Failed to fetch project asset' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, cookies, locals }) => {
	const { assetId } = params;
	const body = await request.json();
	const { filename, description, tags, metadata } = body;
	
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
			'UpdateProjectAsset',
			{ id: assetId, filename, description, tags: tags || [], metadata },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Project Asset API] Error:', error);
		return json({ error: 'Failed to update project asset' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	const { assetId } = params;
	
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
		const response = await callGrpcService('DeleteProjectAsset', { id: assetId }, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Project Asset API] Error:', error);
		return json({ error: 'Failed to delete project asset' }, { status: 500 });
	}
};
