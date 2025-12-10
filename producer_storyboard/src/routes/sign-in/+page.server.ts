/**
 * Sign-in page server load function
 * Redirects authenticated users to project list or organization selection
 * Based on svelte-clerk documentation
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession, getUserOrganizations } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ cookies, request }) => {
	console.log('[SignIn Server] Load function called', {
		url: request.url,
		method: request.method,
	});
	
	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);
	
	console.log('[SignIn Server] Auth result:', {
		isAuthenticated: authResult.isAuthenticated,
		userId: authResult.userId,
		orgId: authResult.orgId,
		hasOrg: authResult.hasOrg,
	});

	// If user is already authenticated, redirect to project management page
	if (authResult.isAuthenticated && authResult.userId) {
		// If user has an organization ID, redirect directly to project list
		if (authResult.orgId) {
			console.log('[SignIn] Server: User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${authResult.orgId}/project`);
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${authResult.orgId}/project`);
		}

		// Otherwise, check user's organizations
		const organizations = await getUserOrganizations(authResult.userId);

		// If user has only one organization, redirect to its project list
		if (organizations.length === 1 && organizations[0]) {
			console.log('[SignIn] Server: User has one org, redirecting to:', `/${DEFAULT_LANG}/orgs/${organizations[0].id}/project`);
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${organizations[0].id}/project`);
		}

		// If user has multiple organizations, redirect to organization selection
		if (organizations.length > 1) {
			console.log('[SignIn] Server: User has multiple orgs, redirecting to organization selection');
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		}

		// If user has no organizations, still redirect to organization selection
		// (they can create one or wait for an invitation)
		console.log('[SignIn] Server: User has no orgs, redirecting to organization selection');
		throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
	}

	return {};
};
