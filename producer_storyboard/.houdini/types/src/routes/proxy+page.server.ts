// @ts-nocheck
/**
 * Root page server load function
 * Redirects to default lang and organization route
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEFAULT_LANG = 'ja';

export const load = async ({ url, cookies, locals }: Parameters<PageServerLoad>[0]) => {
	// If user is accessing root, redirect to default lang route
	if (url.pathname === '/') {
		// Get auth from locals (set by withClerkHandler)
		const auth = locals.auth();
		
		if (auth.userId && auth.orgId) {
			// User is authenticated and has an organization
			// Save preferred org in cookie for future visits
			cookies.set('preferred_org_id', auth.orgId, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
			});
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`);
		} else if (auth.userId) {
			// User is authenticated but has no organization
			// Redirect to organization selection
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		} else {
			// User is not authenticated - redirect to sign-in page
			throw redirect(302, '/sign-in');
		}
	}
	
	return {};
};
