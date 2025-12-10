/**
 * API endpoint to get user's organizations
 * Used by OrganizationSwitcher component
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyClerkSession, getUserOrganizations } from '$lib/server/clerk';

export const GET: RequestHandler = async ({ cookies, request }) => {
	try {
		// Verify Clerk session
		const authResult = await verifyClerkSession(cookies, request);

		if (!authResult.isAuthenticated || !authResult.userId) {
			return json({ organizations: [] }, { status: 401 });
		}

		// Get user's organizations
		const organizations = await getUserOrganizations(authResult.userId);

		return json({ organizations });
	} catch (error) {
		console.error('[API] Error fetching organizations:', error);
		return json({ organizations: [] }, { status: 500 });
	}
};

