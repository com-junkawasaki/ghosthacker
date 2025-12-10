// @ts-nocheck
/**
 * Root page server load function
 * Redirects to default lang and organization route
 * 
 * Uses Clerk backend to verify session and redirect to appropriate organization
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession } from '$lib/server/clerk';

const DEFAULT_LANG = 'ja';

export const load = async ({ url, cookies, request }: Parameters<PageServerLoad>[0]) => {
	// If user is accessing root, redirect to default lang route
	if (url.pathname === '/') {
		// Verify Clerk session
		const authResult = await verifyClerkSession(cookies, request);
		
		if (authResult.isAuthenticated && authResult.orgId) {
			// User is authenticated and has an organization
			// Save preferred org in cookie for future visits
			cookies.set('preferred_org_id', authResult.orgId, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
			});
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${authResult.orgId}/project`);
		} else if (authResult.isAuthenticated) {
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
