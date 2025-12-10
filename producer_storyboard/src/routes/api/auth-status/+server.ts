/**
 * API endpoint to get server-side authentication status
 * Used for debugging authentication state
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyClerkSession } from '$lib/server/clerk';

export const GET: RequestHandler = async ({ cookies, request }) => {
	const authResult = await verifyClerkSession(cookies, request);

	return json({
		isAuthenticated: authResult.isAuthenticated,
		userId: authResult.userId,
		orgId: authResult.orgId,
		hasOrg: authResult.hasOrg,
		timestamp: new Date().toISOString(),
	});
};
