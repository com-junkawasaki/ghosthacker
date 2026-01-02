/**
 * gRPC-Connect API Proxy Endpoint
 * Proxies requests to the grpc-go backend service
 * Forwards Clerk authentication headers to the backend
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Use grpc-go service endpoint
function getGrpcApiUrl(request: Request): string {
	if (process.env.VERCEL === '1') {
		// In Vercel, use the grpc-go endpoint
		const url = new URL(request.url);
		return `${url.origin}/api/grpc-go`;
	}
	// Try dynamic env first, then fallback to process.env, then default
	return env.GRPC_API_URL || process.env.GRPC_API_URL || 'http://grpc-go:8081';
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const grpcApiUrl = getGrpcApiUrl(request);
	
	// Get the service and method from the request path
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/').filter(Boolean);
	
	// Extract service and method from path: /api/grpc/storyboard.v1.StoryboardService/ListComposers
	const serviceMethod = pathParts[pathParts.length - 1];
	const servicePath = pathParts.slice(2, -1).join('/');
	
	// Construct the Connect endpoint URL (Connect RPC requires leading slash)
	const connectPath = `/${servicePath}/${serviceMethod}`;
	const targetUrl = `${grpcApiUrl}${connectPath}`;
	
	// Get Clerk session from cookies or locals
	const sessionToken = cookies.get('__session') || request.headers.get('Authorization')?.replace('Bearer ', '');
	const orgId = request.headers.get('X-Org-Id') || url.searchParams.get('orgId');
	const userId = request.headers.get('X-User-Id');
	
	// Read request body
	const body = await request.text();
	
	// Forward request to grpc-go service
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	
	if (sessionToken) {
		headers['Authorization'] = `Bearer ${sessionToken}`;
		headers['X-Clerk-Session'] = sessionToken;
	}
	
	if (orgId) {
		headers['X-Org-Id'] = orgId;
	}
	
	if (userId) {
		headers['X-User-Id'] = userId;
	}
	
	try {
		const response = await fetch(targetUrl, {
			method: 'POST',
			headers,
			body,
		});
		
		const responseText = await response.text();
		
		// Log error responses for debugging
		if (!response.ok) {
			console.error('[gRPC Proxy] Error response:', {
				status: response.status,
				statusText: response.statusText,
				targetUrl,
				responseText: responseText.substring(0, 500),
			});
		}
		
		return new Response(responseText, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'application/json',
			},
		});
	} catch (error) {
		console.error('[gRPC Proxy] Error forwarding request:', {
			error: error instanceof Error ? error.message : String(error),
			targetUrl,
			grpcApiUrl,
		});
		return json(
			{ 
				error: 'Failed to forward request to grpc-go service',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
};

