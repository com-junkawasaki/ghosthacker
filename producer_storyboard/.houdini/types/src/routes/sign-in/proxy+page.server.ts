// @ts-nocheck
/**
 * Sign-in page server load function
 * Redirects authenticated users to project list or organization selection
 * Based on svelte-clerk documentation
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession, getUserOrganizations } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load = async ({ cookies, request }: Parameters<PageServerLoad>[0]) => {
	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// If user is already authenticated, redirect to appropriate page
	if (authResult.isAuthenticated && authResult.userId) {
		// If user has an organization ID, redirect directly to project list
		if (authResult.orgId) {
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${authResult.orgId}/project`);
		}

		// Otherwise, check user's organizations
		const organizations = await getUserOrganizations(authResult.userId);

		// If user has only one organization, redirect to its project list
		if (organizations.length === 1 && organizations[0]) {
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${organizations[0].id}/project`);
		}

		// If user has multiple organizations, redirect to organization selection
		if (organizations.length > 1) {
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		}

		// If user has no organizations, still redirect to organization selection
		// (they can create one or wait for an invitation)
		throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
	}

	return {};
};
