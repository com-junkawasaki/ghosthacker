/**
 * Organization selection page server load function
 * Fetches user's organizations from Clerk
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { lang } = params;
	const validLang = lang || DEFAULT_LANG;

	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();

	// If authenticated, get organizations and handle redirects
	if (auth.userId) {
		// Get user's organizations
		const organizations = await getUserOrganizations(auth.userId);

		// If user has only one organization, redirect to it
		if (organizations.length === 1 && organizations[0]) {
			throw redirect(302, `/${validLang}/orgs/${organizations[0].id}/project`);
		}

		return {
			lang: validLang,
			organizations,
			authResult: {
				isAuthenticated: true,
				userId: auth.userId,
				orgId: auth.orgId,
			},
		};
	}

	// If not authenticated, return empty data
	// Client-side will handle authentication check and redirect if needed
	// This allows the page to load and wait for client-side auth to be established
	return {
		lang: validLang,
		organizations: [],
		authResult: {
			isAuthenticated: false,
			userId: null,
			orgId: null,
		},
	};
};

/**
 * Helper function to get user's organizations using clerkClient
 */
async function getUserOrganizations(userId: string) {
	try {
		const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
			userId,
		});

		return orgMemberships.data?.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			role: membership.role,
		})) || [];
	} catch (error) {
		console.error('[SelectPage] Error fetching organizations:', error);
		return [];
	}
}
