// @ts-nocheck
/**
 * Root page server load function
 * Redirects to default lang and organization route
 * 
 * Note: Clerk organization ID should be obtained from Clerk session
 * For now, we redirect to a placeholder that will be handled client-side
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEFAULT_LANG = 'ja';

export const load = async ({ url, cookies }: Parameters<PageServerLoad>[0]) => {
	// If user is accessing root, redirect to default lang route
	// The organization ID will be determined client-side from Clerk session
	if (url.pathname === '/') {
		// Check if user has a preferred organization in cookies
		const preferredOrgId = cookies.get('preferred_org_id');
		
		if (preferredOrgId) {
			// Redirect to preferred organization
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${preferredOrgId}/project`);
		} else {
			// Redirect to a placeholder route
			// The client-side layout will handle redirecting to the actual organization
			// from Clerk session, or prompt user to select/sign in
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		}
	}
	
	return {};
};
