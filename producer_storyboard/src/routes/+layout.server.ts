/**
 * Server-side layout load function
 * Initializes Clerk configuration and provides initial auth state
 * Hardcoded values from /gftd env clerk
 */
import type { LayoutServerLoad } from './$types';
import { verifyClerkSession } from '$lib/server/clerk';

export const load: LayoutServerLoad = async ({ cookies, request }) => {
	// Hardcoded value from /gftd env clerk as fallback
	const HARDCODED_PUBLISHABLE_KEY = 'pk_test_ZW5vdWdoLWNoaXBtdW5rLTkyLmNsZXJrLmFjY291bnRzLmRldiQ';

	// Use process.env for server-side access to environment variables
	// Fallback to hardcoded value from /gftd env clerk
	const clerkPublishableKey =
		process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
		process.env.CLERK_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
		HARDCODED_PUBLISHABLE_KEY;

	// Verify Clerk session to get initial auth state
	console.log('[Layout Server] Verifying Clerk session...', {
		url: request.url,
		method: request.method,
	});
	
	const authResult = await verifyClerkSession(cookies, request);
	
	console.log('[Layout Server] Auth result:', {
		isAuthenticated: authResult.isAuthenticated,
		userId: authResult.userId,
		orgId: authResult.orgId,
		hasOrg: authResult.hasOrg,
	});

	if (!clerkPublishableKey || clerkPublishableKey === '') {
		console.error(
			'[Clerk] PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY is not set. Using hardcoded fallback.'
		);
		return {
			clerkPublishableKey: HARDCODED_PUBLISHABLE_KEY,
			initialAuthState: {
				isAuthenticated: authResult.isAuthenticated,
				userId: authResult.userId,
				orgId: authResult.orgId,
			},
		};
	}

	return {
		clerkPublishableKey,
		initialAuthState: {
			isAuthenticated: authResult.isAuthenticated,
			userId: authResult.userId,
			orgId: authResult.orgId,
		},
	};
};
