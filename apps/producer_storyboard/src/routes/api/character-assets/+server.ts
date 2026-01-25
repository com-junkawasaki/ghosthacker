/**
 * Character Assets API Endpoint
 * Proxies character asset-related requests to grpc-go service
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

export const GET: RequestHandler = async ({ request, url, cookies, locals }) => {
	const characterId = url.searchParams.get('characterId');
	if (!characterId) {
		return json({ error: 'characterId is required' }, { status: 400 });
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
		const response = await callGrpcService('ListCharacterAssets', { characterId }, headers);
		const data = await response.json();
		return json({ assets: data.assets || [] });
	} catch (error) {
		console.error('[Character Assets API] Error:', error);
		return json({ error: 'Failed to fetch character assets' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const formData = await request.formData();
	const file = formData.get('file') as File;
	const characterId = formData.get('characterId') as string;
	const assetType = formData.get('assetType') as string;
	const assetFormat = formData.get('assetFormat') as string;
	
	if (!file || !characterId || !assetType) {
		return json({ error: 'file, characterId, and assetType are required' }, { status: 400 });
	}
	
	// Read file as base64
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const base64Data = buffer.toString('base64');
	const assetData = `data:${file.type};base64,${base64Data}`;
	
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
			'UploadCharacterAsset',
			{ characterId, assetData, assetType, assetFormat },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Character Assets API] Error:', error);
		return json({ error: 'Failed to upload character asset' }, { status: 500 });
	}
};

