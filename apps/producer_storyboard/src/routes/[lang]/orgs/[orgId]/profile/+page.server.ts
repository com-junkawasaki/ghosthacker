/**
 * Profile page server load function
 * Requires authentication
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { lang, orgId } = params;
	const validLang = lang || DEFAULT_LANG;

	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();

	// Require authentication - redirect to sign-in if not authenticated
	if (!auth.userId) {
		throw redirect(302, '/sign-in');
	}

	return {
		lang: validLang,
		orgId: orgId || null,
		authResult: {
			isAuthenticated: true,
			userId: auth.userId,
			orgId: auth.orgId,
		},
	};
};
