import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Buffer } from 'buffer';

// Use GraphQL API proxy instead of direct connection
function getGraphQLApiUrl(request: Request): string {
	if (process.env.VERCEL === '1') {
		const url = new URL(request.url);
		return `${url.origin}/api/graphql`;
	}
	return '/api/graphql';
}

export const GET: RequestHandler = async ({ params, request, cookies, locals }) => {
	const assetId = params.assetId;
	
	if (!assetId) {
		return json({ error: 'Asset ID is required' }, { status: 400 });
	}

	try {
		// Get auth from locals (set by withClerkHandler)
		const auth = locals.auth();
		
		// Prepare headers with authentication
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		
		// Forward org ID header if present, or use from auth locals
		const orgId = request.headers.get('x-org-id') || auth.orgId;
		if (orgId) {
			headers['X-Org-Id'] = orgId;
		}
		
		// Forward user ID from auth locals (required for require_auth_and_org)
		if (auth.userId) {
			headers['X-User-Id'] = auth.userId;
		}
		
		// Also check for Clerk session cookie
		const clerkSession = cookies.get('__session');
		if (clerkSession) {
			headers['X-Clerk-Session'] = clerkSession;
		}
		
		const graphqlApiUrl = getGraphQLApiUrl(request);
		
		// Query GraphQL API via proxy to get asset data
		const response = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetCharacterAssetData($assetId: ID!) {
						characterAssetData(assetId: $assetId)
					}
				`,
				variables: {
					assetId,
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`GraphQL API error: ${response.statusText}`);
		}

		const result = await response.json();
		
		if (result.errors) {
			throw new Error(result.errors[0].message);
		}

		let assetData = result.data?.characterAssetData;
		if (!assetData) {
			return json({ error: 'Asset not found' }, { status: 404 });
		}

		// Remove data URL prefix if present (e.g., "data:image/png;base64,")
		if (typeof assetData === 'string' && assetData.includes(',')) {
			assetData = assetData.split(',')[1];
		}

		// Get asset format and type from a separate query
		const formatResponse = await fetch(graphqlApiUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetCharacterAssetInfo($assetId: ID!) {
						characterAssets(characterId: $assetId) {
							assetType
							assetFormat
						}
					}
				`,
				variables: {
					assetId,
				},
			}),
		});

		let contentType = 'application/octet-stream';
		if (formatResponse.ok) {
			const formatResult = await formatResponse.json();
			const asset = formatResult.data?.characterAssets?.[0];
			if (asset) {
				const format = asset.assetFormat?.toLowerCase() || '';
				if (asset.assetType === 'image') {
					if (format === 'jpeg' || format === 'jpg') {
						contentType = 'image/jpeg';
					} else if (format === 'png') {
						contentType = 'image/png';
					} else if (format === 'webp') {
						contentType = 'image/webp';
					} else {
						contentType = 'image/png'; // Default for images
					}
				} else if (asset.assetType === 'audio') {
					if (format === 'mp3') {
						contentType = 'audio/mpeg';
					} else if (format === 'wav') {
						contentType = 'audio/wav';
					} else if (format === 'ogg') {
						contentType = 'audio/ogg';
					} else {
						contentType = 'audio/mpeg'; // Default for audio
					}
				}
			}
		}

		// Decode base64 asset data
		const assetBuffer = Buffer.from(assetData, 'base64');
		
		return new Response(assetBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				'Cross-Origin-Resource-Policy': 'cross-origin'
			},
		});
	} catch (error) {
		console.error('[Character Asset API] Error fetching asset:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch asset' },
			{ status: 500 }
		);
	}
};


