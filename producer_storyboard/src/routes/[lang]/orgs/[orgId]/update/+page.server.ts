/**
 * Profile update page redirect
 * Redirects to the profile page
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { lang, orgId } = params;
	const DEFAULT_LANG = 'ja';
	const validLang = lang || DEFAULT_LANG;
	
	// Redirect to profile page
	throw redirect(302, `/${validLang}/orgs/${orgId}/profile`);
};

