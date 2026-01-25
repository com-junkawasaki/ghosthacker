/**
 * API endpoint to get user's organizations
 * Used by OrganizationSwitcher component
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clerkClient } from 'svelte-clerk/server';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Get auth from locals (set by withClerkHandler)
		const auth = locals.auth();

		if (!auth.userId) {
			return json({ organizations: [] }, { status: 401 });
		}

		// Get user's organizations
		const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
			userId: auth.userId,
		});

		const organizations = orgMemberships.data?.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			role: membership.role,
		})) || [];

		return json({ organizations });
	} catch (error) {
		console.error('[API] Error fetching organizations:', error);
		return json({ organizations: [] }, { status: 500 });
	}
};
