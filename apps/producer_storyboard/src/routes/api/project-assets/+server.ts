/**
 * Project Assets API Endpoint
 * Proxies project asset-related requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
	const projectId = url.searchParams.get('projectId');
	if (!projectId) {
		return json({ error: 'projectId is required' }, { status: 400 });
	}
	
	const assetType = url.searchParams.get('assetType');
	const tags = url.searchParams.get('tags')?.split(',') || [];
	
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
		const requestBody: any = { projectId };
		if (assetType) {
			requestBody.assetType = assetType;
		}
		if (tags.length > 0) {
			requestBody.tags = tags;
		}
		
		const response = await callGrpcService('ListProjectAssets', requestBody, headers);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Project Assets API] Error:', error);
		return json({ error: 'Failed to fetch project assets' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { projectId, assetType, assetDataBase64, assetFormat, filename, description, tags, metadata } = body;
	
	if (!projectId || !assetType || !assetDataBase64) {
		return json({ error: 'projectId, assetType, and assetDataBase64 are required' }, { status: 400 });
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
			'CreateProjectAsset',
			{ projectId, assetType, assetDataBase64, assetFormat, filename, description, tags: tags || [], metadata },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Project Assets API] Error:', error);
		return json({ error: 'Failed to create project asset' }, { status: 500 });
	}
};
