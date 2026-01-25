/**
 * Environment Individual API Endpoint
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { request as httpRequest } from 'http';

const GRPC_API_URL = process.env.GRPC_API_URL || 'http://localhost:25326';

async function callGrpcService(
	method: string,
	requestBody: Record<string, unknown>,
	headers: Record<string, string>
): Promise<Response> {
	const url = `${GRPC_API_URL}/storyboard.v1.StoryboardService/${method}`;
	const targetUrl = new URL(url);
	const isHttps = targetUrl.protocol === 'https:';

	if (isHttps) {
		return await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify(requestBody),
		});
	} else {
		return await new Promise<Response>((resolve, reject) => {
			const postData = JSON.stringify(requestBody);
			const options = {
				hostname: targetUrl.hostname,
				port: targetUrl.port || 80,
				path: targetUrl.pathname + targetUrl.search,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData),
					...headers,
				},
				family: 4,
			};

			const req = httpRequest(options, (res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk) => chunks.push(chunk));
				res.on('end', () => {
					const body = Buffer.concat(chunks).toString();
					const response = new Response(body, {
						status: res.statusCode || 500,
						statusText: res.statusMessage || 'OK',
						headers: Object.fromEntries(
							Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v || ''])
						),
					});
					resolve(response);
				});
			});

			req.on('error', (error) => {
				reject(error);
			});

			req.write(postData);
			req.end();
		});
	}
}

function getAuthHeaders(locals: App.Locals, cookies: ReturnType<typeof import('@sveltejs/kit').cookies>): Record<string, string> {
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

	return headers;
}

export const DELETE: RequestHandler = async ({ params, cookies, locals }) => {
	const { id } = params;
	const headers = getAuthHeaders(locals, cookies);

	try {
		const response = await callGrpcService('DeleteEnvironment', { id }, headers);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Failed to delete environment' }));
			return json(errorData, { status: response.status });
		}
		
		return json({ success: true });
	} catch (error) {
		console.error('[Environments API] Error:', error);
		return json({ error: 'Failed to delete environment' }, { status: 500 });
	}
};

