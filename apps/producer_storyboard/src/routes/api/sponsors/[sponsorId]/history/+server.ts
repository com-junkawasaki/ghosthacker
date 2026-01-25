/**
 * Sponsor History API Endpoint
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
		console.error('[Sponsor History API] gRPC service error:', {
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

export const GET: RequestHandler = async ({ params, url, locals, request }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const { sponsorId } = params;
	const searchParams = url.searchParams;
	const eventType = searchParams.get('eventType');
	
	const requestBody: any = { sponsorId };
	if (eventType) {
		requestBody.eventType = eventType.toUpperCase();
	}
	
	const response = await callGrpcService('ListSponsorHistory', requestBody, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to fetch sponsor history' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const authHeaders = getAuthHeaders(locals, request);
	const { sponsorId } = params;
	const body = await request.json();
	
	const requestBody = {
		sponsorId,
		eventType: body.eventType?.toUpperCase() || 'CONTACT',
		eventDate: body.eventDate,
		description: body.description,
		metadata: body.metadata || {},
	};
	
	const response = await callGrpcService('CreateSponsorHistory', requestBody, authHeaders);
	
	if (!response.ok) {
		return json({ error: 'Failed to create sponsor history' }, { status: response.status });
	}
	
	const data = await response.json();
	return json(data);
};
