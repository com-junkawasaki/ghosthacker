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
		// First check if the requested org matches the current session org
		const isCurrentSessionOrg = auth.orgId === orgId;

		console.log('[OrgLayout Server] Pre-verification check:', {
			userId: auth.userId,
			requestedOrgId: orgId,
			currentSessionOrgId: auth.orgId,
			isCurrentSessionOrg,
			willCheckMembership: !isCurrentSessionOrg,
		});

		// Verify user has access to this organization
		// If current session org matches, grant access immediately
		// Otherwise, check membership via Clerk API
		let hasAccess = isCurrentSessionOrg;
		
		if (!hasAccess) {
			// Fetch user's organizations to verify membership
			const availableOrgs = await getUserOrganizations(auth.userId);
			console.log('[OrgLayout Server] User organizations from Clerk API:', {
				count: availableOrgs.length,
				orgIds: availableOrgs.map(org => org.id),
				orgNames: availableOrgs.map(org => ({ id: org.id, name: org.name, role: org.role })),
			});
			
			hasAccess = availableOrgs.some(org => org.id === orgId);
			
			if (!hasAccess) {
				console.warn('[OrgLayout Server] Organization not found in user membership list:', {
					requestedOrgId: orgId,
					availableOrgIds: availableOrgs.map(org => org.id),
					possibleIssues: [
						'Organization was created but user was not added as a member',
						'Organization membership was not properly synced with Clerk',
						'User needs to refresh their session after creating organization',
						'Organization ID mismatch between frontend and Clerk',
					],
				});
			}
		}

		console.log('[OrgLayout Server] Organization access check result:', {
			userId: auth.userId,
			requestedOrgId: orgId,
			currentOrgId: auth.orgId,
			isCurrentSessionOrg,
			hasAccess,
		});

		if (!hasAccess) {
			// User doesn't have access to this organization
			// Log available organizations for debugging
			const availableOrgs = await getUserOrganizations(auth.userId);
			console.error('[OrgLayout Server] Access denied - Available organizations:', {
				count: availableOrgs.length,
				organizations: availableOrgs,
				requestedOrgId: orgId,
				userId: auth.userId,
			});

			// Allow access in development mode for debugging
			const isDevelopment = process.env.NODE_ENV !== 'production';
			if (!isDevelopment) {
				throw error(403, `Access denied to organization: ${orgId}`);
			} else {
				console.warn('[OrgLayout Server] ACCESS DENIED BUT ALLOWED IN DEVELOPMENT MODE');
				console.warn('[OrgLayout Server] This should be fixed before production deployment');
			}
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
		console.log('[OrgLayout] Fetching organizations for user:', userId);
		const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
			userId,
		});

		console.log('[OrgLayout] Clerk API response:', {
			totalCount: orgMemberships.totalCount,
			organizationCount: orgMemberships.data?.length || 0,
			organizations: orgMemberships.data?.map(m => ({
				id: m.organization.id,
				name: m.organization.name,
				slug: m.organization.slug,
			})) || [],
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
		console.log('[OrgLayout] Checking org access:', {
			userId,
			requestedOrgId: orgId,
			availableOrgIds: organizations.map(org => org.id),
		});
		const hasAccess = organizations.some(org => org.id === orgId);
		console.log('[OrgLayout] Access result:', hasAccess);
		return hasAccess;
	} catch (error) {
		console.error('[OrgLayout] Error verifying org access:', error);
		return false;
	}
}
