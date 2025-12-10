// @ts-nocheck
/**
 * Profile page server load function
 * Requires authentication
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load = async ({ params, cookies, request }: Parameters<PageServerLoad>[0]) => {
	const { lang, orgId } = params;
	const validLang = lang || DEFAULT_LANG;

	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// Require authentication - redirect to sign-in if not authenticated
	if (!authResult.isAuthenticated) {
		throw redirect(302, '/sign-in');
	}

	return {
		lang: validLang,
		orgId: orgId || null,
		authResult,
	};
};
