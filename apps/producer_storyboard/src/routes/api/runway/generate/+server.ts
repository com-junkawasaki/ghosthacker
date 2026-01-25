/**
 * Runway Video Generation API Endpoint
 * Proxies video generation requests to grpc-go service
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

function getAuthHeaders(locals: App.Locals): Record<string, string> {
	const auth = locals.auth();
	const headers: Record<string, string> = {};

	if (auth.orgId) {
		headers['X-Org-Id'] = auth.orgId;
	}
	if (auth.userId) {
		headers['X-User-Id'] = auth.userId;
	}

	return headers;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const auth = locals.auth();
	if (!auth?.userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { storyboardId, promptText, promptImageUrl, model, duration, aspectRatio, seed } = body;

	if (!storyboardId || !promptText) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const headers = getAuthHeaders(locals);

	try {
		const response = await callGrpcService(
			'GenerateVideo',
			{
				storyboardId,
				variationNumber: 1,
				provider: 'VIDEO_GENERATION_PROVIDER_RUNWAY',
				params: {
					runway: {
						promptText,
						promptImageUrl: promptImageUrl || null,
						model: model || 'gen3a_turbo',
						duration: duration || 5,
						aspectRatio: aspectRatio || null,
						seed: seed || null,
					},
				},
			},
			headers
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Failed to generate video' }));
			return json(errorData, { status: response.status });
		}

		const data = await response.json();
		return json({
			id: data.id,
			taskId: data.taskId,
			status: data.status,
			provider: data.provider,
		});
	} catch (error) {
		console.error('Failed to generate video:', error);
		return json({ error: 'Failed to generate video' }, { status: 500 });
	}
};
