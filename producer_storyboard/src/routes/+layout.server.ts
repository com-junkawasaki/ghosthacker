/**
 * Server-side layout load function
 * Initializes Clerk configuration and provides initial auth state
 * 
 * Note: svelte-clerk's buildClerkProps requires withClerkHandler which has
 * compatibility issues with SvelteKit 2.x. Using custom implementation instead.
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
	const authResult = await verifyClerkSession(cookies, request);
	
	console.log('[Layout Server] Auth result:', {
		isAuthenticated: authResult.isAuthenticated,
		userId: authResult.userId,
		orgId: authResult.orgId,
	});

	const initialAuthState = {
		isAuthenticated: authResult.isAuthenticated,
		userId: authResult.userId,
		orgId: authResult.orgId,
	};

	if (!clerkPublishableKey || clerkPublishableKey === '') {
		console.error(
			'[Clerk] PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY is not set. Using hardcoded fallback.'
		);
		return {
			clerkPublishableKey: HARDCODED_PUBLISHABLE_KEY,
			initialAuthState,
		};
	}

	return {
		clerkPublishableKey,
		initialAuthState,
	};
};
