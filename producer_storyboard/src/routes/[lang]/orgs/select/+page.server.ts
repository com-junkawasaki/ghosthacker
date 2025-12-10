/**
 * Organization selection page server load function
 * Fetches user's organizations from Clerk
 * Handles post-sign-in redirects by being more lenient with authentication checks
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession, getUserOrganizations } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ params, cookies, request, url }) => {
	const { lang } = params;
	const validLang = lang || DEFAULT_LANG;

	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// Check if this is a redirect from sign-in page (to prevent redirect loops)
	const referer = request.headers.get('referer');
	const isFromSignIn = referer?.includes('/sign-in') || url.searchParams.has('from_signin');

	// Require authentication - redirect to sign-in if not authenticated
	// But be more lenient if coming from sign-in page (session might still be establishing)
	if (!authResult.isAuthenticated) {
		// If coming from sign-in, wait a bit longer before redirecting
		// This prevents redirect loops when session cookie is still being set
		if (isFromSignIn) {
			console.log('[OrgSelect] Coming from sign-in but not authenticated yet, allowing page load');
			// Allow the page to load - client-side will handle redirect once auth is established
			return {
				lang: validLang,
				organizations: [],
				authResult,
				isFromSignIn: true,
			};
		}
		throw redirect(302, '/sign-in');
	}

	// Get user's organizations
	const organizations = await getUserOrganizations(authResult.userId!);

	// If user has only one organization, redirect to it
	if (organizations.length === 1 && organizations[0]) {
		console.log('[OrgSelect] User has one org, redirecting to:', `/${validLang}/orgs/${organizations[0].id}/project`);
		throw redirect(302, `/${validLang}/orgs/${organizations[0].id}/project`);
	}

	return {
		lang: validLang,
		organizations,
		authResult,
		isFromSignIn: false,
	};
};
