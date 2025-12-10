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

	// If authenticated, get organizations and handle redirects
	if (authResult.isAuthenticated && authResult.userId) {
		// Get user's organizations
		const organizations = await getUserOrganizations(authResult.userId);

		// If user has only one organization, redirect to it
		if (organizations.length === 1 && organizations[0]) {
			throw redirect(302, `/${validLang}/orgs/${organizations[0].id}/project`);
		}

		return {
			lang: validLang,
			organizations,
			authResult,
		};
	}

	// If not authenticated, return empty data
	// Client-side will handle authentication check and redirect if needed
	// This allows the page to load and wait for client-side auth to be established
	return {
		lang: validLang,
		organizations: [],
		authResult,
	};
};
