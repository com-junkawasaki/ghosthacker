/**
 * BGM API Endpoint
 * Proxies BGM requests to grpc-go service
 * Integrates with Suno API for AI generation
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

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const projectId = url.searchParams.get('projectId');
	
	if (!projectId) {
		return json({ error: 'projectId is required' }, { status: 400 });
	}

	const headers = getAuthHeaders(locals, cookies);

	try {
		const response = await callGrpcService('ListBGM', { projectId }, headers);
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[BGM API] Error from gRPC:', errorData);
			// Return empty list if no BGM exist yet
			return json({ items: [] });
		}
		
		const data = await response.json();
		return json({ items: data.bgmTracks || [] });
	} catch (error) {
		console.error('[BGM API] Error:', error);
		// Return empty list on error
		return json({ items: [] });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { projectId, name, prompt, makeInstrumental, modelVersion } = body;

	if (!projectId) {
		return json({ error: 'projectId is required' }, { status: 400 });
	}
	if (!prompt) {
		return json({ error: 'prompt is required' }, { status: 400 });
	}

	const headers = getAuthHeaders(locals, cookies);

	try {
		// First create the BGM record
		const createResponse = await callGrpcService(
			'CreateBGM',
			{
				projectId,
				name: name || 'Generated BGM',
				prompt,
				status: 'generating',
			},
			headers
		);

		if (!createResponse.ok) {
			const errorData = await createResponse.json().catch(() => ({ error: 'Failed to create BGM' }));
			return json(errorData, { status: createResponse.status });
		}

		const createdBGM = await createResponse.json();

		// Then trigger Suno generation
		const generateResponse = await callGrpcService(
			'GenerateSunoAudio',
			{
				recordId: createdBGM.id,
				recordType: 'bgm',
				prompt,
				makeInstrumental: makeInstrumental ?? true, // Default to instrumental for BGM
				modelVersion: modelVersion || 'chirp-v4',
			},
			headers
		);

		if (!generateResponse.ok) {
			console.warn('[BGM API] Suno generation failed:', await generateResponse.text());
			// Still return the created record, generation will be retried
		}

		return json(createdBGM);
	} catch (error) {
		console.error('[BGM API] Error:', error);
		return json({ error: 'Failed to create BGM' }, { status: 500 });
	}
};

