/**
 * Sponsor Individual API Endpoint
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
		console.error('[Sponsor API] gRPC service error:', {
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

export const GET: RequestHandler = async ({ params, locals, request }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const { sponsorId } = params;
	
	const response = await callGrpcService('GetSponsor', { sponsorId }, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to fetch sponsor' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const { sponsorId } = params;
	const body = await request.json();
	
	const requestBody = {
		sponsorId,
		name: body.name,
		industry: body.industry,
		contactEmail: body.contactEmail,
		contactPhone: body.contactPhone,
		website: body.website,
		address: body.address,
		budgetMin: body.budgetMin,
		budgetMax: body.budgetMax,
		preferences: body.preferences,
		status: body.status,
		notes: body.notes,
	};
	
	const response = await callGrpcService('UpdateSponsor', requestBody, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to update sponsor' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const { sponsorId } = params;
	
	const response = await callGrpcService('DeleteSponsor', { sponsorId }, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to delete sponsor' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};
