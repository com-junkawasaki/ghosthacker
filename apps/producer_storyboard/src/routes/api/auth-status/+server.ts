/**
 * API endpoint to get server-side authentication status
 * Used for debugging authentication state
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();

	return json({
		isAuthenticated: !!auth.userId,
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
		timestamp: new Date().toISOString(),
	});
};
