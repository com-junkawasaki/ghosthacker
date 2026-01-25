/**
 * Sponsors API Endpoint
 * Proxies sponsor-related requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const GRPC_API_URL = env.GRPC_API_URL || process.env.GRPC_API_URL || 'http://grpc-go:8081';

async function callGrpcService(
	method: string,
	requestBody: any,
	headers: Record<string, string>
): Promise<Response> {
	const connectPath = `/storyboard.v1.StoryboardService/${method}`;
	const url = `${GRPC_API_URL}${connectPath}`;
	
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: JSON.stringify(requestBody),
	});
	
	if (!response.ok) {
		const responseText = await response.text().catch(() => '');
		console.error('[Sponsors API] gRPC service error:', {
			status: response.status,
			statusText: response.statusText,
			method,
			url,
			responseText: responseText.substring(0, 500),
		});
	}
	
	return response;
}

function getAuthHeaders(locals: App.Locals, request: Request): Record<string, string> {
	const headers: Record<string, string> = {};
	const auth = locals.auth();
	const orgId = request.headers.get('X-Org-Id');
	
	if (auth.userId) {
		headers['X-User-Id'] = auth.userId;
	}
	
	if (orgId) {
		headers['X-Org-Id'] = orgId;
	}
	
	return headers;
}

export const GET: RequestHandler = async ({ request, url, locals }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const searchParams = url.searchParams;
	
	const orgId = searchParams.get('orgId') || authHeaders['X-Org-Id'];
	const projectId = searchParams.get('projectId');
	const status = searchParams.get('status');
	const industry = searchParams.get('industry');
	const searchQuery = searchParams.get('search');
	
	const requestBody: any = {
		orgId: orgId || '',
	};
	
	if (projectId) {
		requestBody.projectId = projectId;
	}
	if (status) {
		requestBody.status = status.toUpperCase();
	}
	if (industry) {
		requestBody.industry = industry;
	}
	if (searchQuery) {
		requestBody.searchQuery = searchQuery;
	}
	
	const response = await callGrpcService('ListSponsors', requestBody, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to fetch sponsors' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const body = await request.json();
	
	const orgId = body.orgId || authHeaders['X-Org-Id'];
	if (!orgId) {
		return json({ error: 'orgId is required' }, { status: 400 });
	}
	
	const requestBody = {
		orgId,
		projectId: body.projectId,
		name: body.name,
		industry: body.industry,
		contactEmail: body.contactEmail,
		contactPhone: body.contactPhone,
		website: body.website,
		address: body.address,
		budgetMin: body.budgetMin,
		budgetMax: body.budgetMax,
		preferences: body.preferences || {},
		notes: body.notes,
	};
	
	const response = await callGrpcService('CreateSponsor', requestBody, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to create sponsor' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};
