/**
 * Server-side layout load function for organization-scoped routes
 * Handles lang and orgId parameter validation and Clerk organization mapping
 */
import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { verifyClerkSession, getUserOrganizations, verifyOrgAccess } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load: LayoutServerLoad = async ({ params, url, cookies, request }) => {
	const { lang, orgId } = params;

	// Validate and set default lang
	const validLang = lang || DEFAULT_LANG;
	if (lang && lang !== validLang) {
		// Redirect to correct lang if invalid
		const newUrl = url.pathname.replace(`/${lang}`, `/${validLang}`);
		throw redirect(302, newUrl);
	}

	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// Require authentication - redirect to sign-in if not authenticated
	if (!authResult.isAuthenticated) {
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
		const organizations = await getUserOrganizations(authResult.userId!);
		return {
			lang: validLang,
			orgId: null,
			authResult,
			organizations,
		};
	}

	// Validate orgId if provided
	if (orgId) {
		// Verify user has access to this organization
		const hasAccess = await verifyOrgAccess(authResult.userId!, orgId);
		
		if (!hasAccess) {
			// User doesn't have access to this organization
			// Throw error to trigger error page
			throw error(403, `Access denied to organization: ${orgId}`);
		}
	} else {
		// No orgId in URL, but user is authenticated
		// If user has a default org, redirect to it
		if (authResult.orgId) {
			throw redirect(302, `/${validLang}/orgs/${authResult.orgId}${url.pathname.replace(/^\/[^/]+\/orgs\/[^/]+/, '') || '/project'}`);
		}
		// Otherwise, redirect to select page
		throw redirect(302, `/${validLang}/orgs/select/project`);
	}

	// Get user's organizations for navigation
	const organizations = await getUserOrganizations(authResult.userId!);

	return {
		lang: validLang,
		orgId: orgId || null,
		authResult,
		organizations,
	};
};

