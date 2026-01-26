/**
 * Voice Presets API Endpoint
 * Proxies voice preset-related requests to grpc-go service
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

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:29',message:'GET handler called',data:{url:url.toString(),searchParams:Object.fromEntries(url.searchParams)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
	// #endregion
	
	const projectId = url.searchParams.get('projectId');
	if (!projectId) {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:32',message:'Missing projectId',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
		// #endregion
		return json({ error: 'projectId is required' }, { status: 400 });
	}
	
	const characterId = url.searchParams.get('characterId');
	
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
	
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:53',message:'Before gRPC call',data:{projectId,characterId,hasOrgId:!!auth.orgId,hasUserId:!!auth.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
	// #endregion
	
	try {
		const requestBody: any = { projectId };
		if (characterId) {
			requestBody.characterId = characterId;
		}
		
		const response = await callGrpcService('ListVoicePresets', requestBody, headers);
		// #region agent log
		const logData = { status: response.status, statusText: response.statusText, ok: response.ok };
		fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:54',message:'gRPC service response',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
		// #endregion
		
		if (!response.ok) {
			const errorText = await response.text();
			// #region agent log
			fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:59',message:'gRPC service error',data:{status:response.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
			// #endregion
			return json({ error: errorText || 'Failed to fetch voice presets' }, { status: response.status });
		}
		
		const data = await response.json();
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:66',message:'gRPC response parsed',data:{hasPresets:!!data?.presets,presetsCount:data?.presets?.length||0,dataKeys:Object.keys(data||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
		// #endregion
		return json(data);
	} catch (error) {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/7e72d231-80f0-42e1-9016-64156099317e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice-presets/+server.ts:70',message:'Exception in API handler',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
		// #endregion
		console.error('[Voice Presets API] Error:', error);
		return json({ error: error instanceof Error ? error.message : 'Failed to fetch voice presets' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json();
	const { projectId, name, humeVoiceId, description, characterId, sampleAudioId, settings } = body;
	
	if (!projectId || !name || !humeVoiceId) {
		return json({ error: 'projectId, name, and humeVoiceId are required' }, { status: 400 });
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
			'CreateVoicePreset',
			{ projectId, name, humeVoiceId, description, characterId, sampleAudioId, settings },
			headers
		);
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('[Voice Presets API] Error:', error);
		return json({ error: 'Failed to create voice preset' }, { status: 500 });
	}
};
