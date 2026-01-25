/**
 * Projects API Endpoint
 * Proxies project-related requests to grpc-go service
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { request } from 'http';

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
				family: 4, // Force IPv4
			};

			const req = request(options, (res) => {
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

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	// #region agent log
	const debugLog = (location: string, message: string, data: Record<string, unknown>) => {
		const logEntry = {
			location,
			message,
			data,
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			env: process.env.NODE_ENV || 'unknown',
			vercelEnv: process.env.VERCEL_ENV || 'unknown',
		};
		console.log('[DEBUG]', JSON.stringify(logEntry));
	};
	
	debugLog('api/projects/+server.ts:72', 'GET /api/projects called', {
		url: url.toString(),
		pathname: url.pathname,
		hasLocals: !!locals,
		hasCookies: !!cookies,
	});
	// #endregion
	
	const auth = locals.auth();
	
	// #region agent log
	debugLog('api/projects/+server.ts:82', 'Auth state from locals', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
		hasAuth: !!auth,
	});
	// #endregion
	
	const headers: Record<string, string> = {};

	if (auth.orgId) {
		headers['X-Org-Id'] = auth.orgId;
	}
	if (auth.userId) {
		headers['X-User-Id'] = auth.userId;
	}

	const sessionToken = cookies.get('__session');
	
	// #region agent log
	debugLog('api/projects/+server.ts:95', 'Session token check', {
		hasSessionToken: !!sessionToken,
		sessionTokenLength: sessionToken?.length || 0,
		allCookies: Object.keys(cookies.getAll()),
	});
	// #endregion
	
	if (sessionToken) {
		headers['Authorization'] = `Bearer ${sessionToken}`;
		headers['X-Clerk-Session'] = sessionToken;
	}

	try {
		// #region agent log
		debugLog('api/projects/+server.ts:105', 'Calling gRPC service', {
			grpcApiUrl: process.env.GRPC_API_URL || 'http://localhost:25326',
			headers: Object.keys(headers),
			hasOrgId: !!headers['X-Org-Id'],
			hasUserId: !!headers['X-User-Id'],
		});
		// #endregion
		
		const response = await callGrpcService('ListProjects', {}, headers);
		
		// #region agent log
		debugLog('api/projects/+server.ts:113', 'gRPC service response', {
			status: response.status,
			ok: response.ok,
			statusText: response.statusText,
		});
		// #endregion
		
		const data = await response.json();
		
		// #region agent log
		debugLog('api/projects/+server.ts:120', 'Returning projects data', {
			projectsCount: data?.projects?.length || 0,
			hasData: !!data,
		});
		// #endregion
		
		return json(data);
	} catch (error) {
		// #region agent log
		debugLog('api/projects/+server.ts:127', 'Error in GET handler', {
			error: String(error),
			errorName: (error as Error)?.name,
			errorMessage: (error as Error)?.message,
			errorStack: (error as Error)?.stack,
		});
		// #endregion
		
		console.error('[Projects API] Error:', error);
		return json({ error: 'Failed to fetch projects' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { title, description } = body;

	if (!title) {
		return json({ error: 'title is required' }, { status: 400 });
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
			'CreateProject',
			{ title, description },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Projects API] Error:', error);
		return json({ error: 'Failed to create project' }, { status: 500 });
	}
};
