// @ts-nocheck
/**
 * Sign-in page server load function
 * Redirects authenticated users to project list or organization selection (svelte-clerk v0.20.1+)
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';

const DEFAULT_LANG = 'ja';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();
	
	console.log('[SignIn Server] Auth state:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
	});

	// If user is already authenticated, redirect to project management page
	if (auth.userId) {
		// If user has an organization ID, redirect directly to project list
		if (auth.orgId) {
			console.log('[SignIn] Server: User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`);
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`);
		}

		// Otherwise, check user's organizations using clerkClient
		try {
			const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
				userId: auth.userId,
			});

			const organizations = orgMemberships.data?.map((membership) => ({
				id: membership.organization.id,
				name: membership.organization.name,
				slug: membership.organization.slug,
				role: membership.role,
			})) || [];

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
		} catch (error) {
			// Re-throw redirect errors
			if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
				throw error;
			}
			console.error('[SignIn] Server: Error fetching organizations:', error);
			// On error, still redirect to organization selection
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		}
	}

	return {};
};
