/**
 * Resource Tags API Endpoint
 * Manages tag assignments to resources
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
	const resourceType = url.searchParams.get('resourceType');
	const resourceId = url.searchParams.get('resourceId');
	
	if (!resourceType || !resourceId) {
		return json({ error: 'resourceType and resourceId are required' }, { status: 400 });
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
			'ListResourceTags',
			{ resourceType, resourceId },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Resource Tags API] Error:', error);
		return json({ error: 'Failed to fetch resource tags' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { resourceType, resourceId, tagId } = body;
	
	if (!resourceType || !resourceId || !tagId) {
		return json({ error: 'resourceType, resourceId, and tagId are required' }, { status: 400 });
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
			'AddResourceTag',
			{ resourceType, resourceId, tagId },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Resource Tags API] Error:', error);
		return json({ error: 'Failed to add resource tag' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, url, cookies, locals }) => {
	const resourceType = url.searchParams.get('resourceType');
	const resourceId = url.searchParams.get('resourceId');
	const tagId = url.searchParams.get('tagId');
	
	if (!resourceType || !resourceId || !tagId) {
		return json({ error: 'resourceType, resourceId, and tagId are required' }, { status: 400 });
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
			'RemoveResourceTag',
			{ resourceType, resourceId, tagId },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Resource Tags API] Error:', error);
		return json({ error: 'Failed to remove resource tag' }, { status: 500 });
	}
};
