/**
 * Sign-in page server load function
 * Redirects authenticated users to organization selection
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyClerkSession } from '$lib/server/clerk';

export const load: PageServerLoad = async ({ cookies, request }) => {
	// Verify Clerk session
	const authResult = await verifyClerkSession(cookies, request);

	// If user is already authenticated, redirect to organization selection
	if (authResult.isAuthenticated) {
		throw redirect(302, '/ja/orgs/select/project');
	}

	return {
		authResult,
	};
};
