// @ts-nocheck
/**
 * Server-side layout load function for organization-scoped routes
 * Handles lang and orgId parameter validation and Clerk organization mapping
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const DEFAULT_LANG = 'ja';

export const load = async ({ params, url }: Parameters<LayoutServerLoad>[0]) => {
	const { lang, orgId } = params;

	// Validate and set default lang
	const validLang = lang || DEFAULT_LANG;
	if (lang !== validLang) {
		// Redirect to correct lang if invalid
		const newUrl = url.pathname.replace(`/${lang}`, `/${validLang}`);
		throw redirect(302, newUrl);
	}

	// TODO: Validate orgId against Clerk organization
	// For now, we'll accept any orgId and validate it client-side
	// In production, you should verify the orgId exists and user has access

	return {
		lang: validLang,
		orgId: orgId || null,
	};
};
