/**
 * Organization selection page server load function
 * Fetches user's organizations from Clerk
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession, getUserOrganizations } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ params, cookies, request }) => {
	const { lang } = params;
	const validLang = lang || DEFAULT_LANG;

	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// Require authentication - redirect to sign-in if not authenticated
	if (!authResult.isAuthenticated) {
		throw redirect(302, '/sign-in');
	}

	// Get user's organizations
	const organizations = await getUserOrganizations(authResult.userId!);

	// If user has only one organization, redirect to it
	if (organizations.length === 1 && organizations[0]) {
		throw redirect(302, `/${validLang}/orgs/${organizations[0].id}/project`);
	}

	return {
		lang: validLang,
		organizations,
		authResult,
	};
};
