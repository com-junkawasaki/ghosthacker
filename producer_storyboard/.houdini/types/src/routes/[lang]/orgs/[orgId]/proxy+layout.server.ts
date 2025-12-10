// @ts-nocheck
/**
 * Server-side layout load function for organization-scoped routes
 * Handles lang and orgId parameter validation and Clerk organization mapping
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';

const DEFAULT_LANG = 'ja';

export const load = async ({ params, url, locals }: Parameters<LayoutServerLoad>[0]) => {
	const { lang, orgId } = params;

	// Validate and set default lang
	const validLang = lang || DEFAULT_LANG;
	if (lang && lang !== validLang) {
		// Redirect to correct lang if invalid
		const newUrl = url.pathname.replace(`/${lang}`, `/${validLang}`);
		throw redirect(302, newUrl);
	}

	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();
	
	console.log('[OrgLayout Server] Auth state:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
	});

	// Require authentication - redirect to sign-in if not authenticated
	if (!auth.userId) {
		// If orgId is 'select', redirect to sign-in (authentication required)
		if (orgId === 'select') {
			throw redirect(302, '/sign-in');
		}
		// Otherwise, redirect to sign-in
		throw redirect(302, '/sign-in');
	}

	// User is authenticated
	// If orgId is 'select', show organization selection
	if (orgId === 'select') {
		const organizations = await getUserOrganizations(auth.userId);
		return {
			lang: validLang,
			orgId: null,
			authResult: {
				isAuthenticated: true,
				userId: auth.userId,
				orgId: auth.orgId,
			},
			organizations,
		};
	}

	// Validate orgId if provided
	if (orgId) {
		// Verify user has access to this organization
		const hasAccess = await verifyOrgAccess(auth.userId, orgId);
		
		if (!hasAccess) {
			// User doesn't have access to this organization
			// Throw error to trigger error page
			throw error(403, `Access denied to organization: ${orgId}`);
		}
	} else {
		// No orgId in URL, but user is authenticated
		// If user has a default org, redirect to it
		if (auth.orgId) {
			throw redirect(302, `/${validLang}/orgs/${auth.orgId}${url.pathname.replace(/^\/[^/]+\/orgs\/[^/]+/, '') || '/project'}`);
		}
		// Otherwise, redirect to select page
		throw redirect(302, `/${validLang}/orgs/select/project`);
	}

	// Get user's organizations for navigation
	const organizations = await getUserOrganizations(auth.userId);

	return {
		lang: validLang,
		orgId: orgId || null,
		authResult: {
			isAuthenticated: true,
			userId: auth.userId,
			orgId: auth.orgId,
		},
		organizations,
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
		console.error('[OrgLayout] Error fetching organizations:', error);
		return [];
	}
}

/**
 * Helper function to verify user has access to an organization
 */
async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
	try {
		const organizations = await getUserOrganizations(userId);
		return organizations.some(org => org.id === orgId);
	} catch (error) {
		console.error('[OrgLayout] Error verifying org access:', error);
		return false;
	}
}
