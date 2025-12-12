/**
 * Server-side layout load function
 * Uses buildClerkProps to pass authentication state to client (svelte-clerk v0.20.1+)
 */
import type { LayoutServerLoad } from './$types';
import { buildClerkProps } from 'svelte-clerk/server';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Hardcoded value from /gftd env clerk as fallback
	const HARDCODED_PUBLISHABLE_KEY = 'pk_test_ZW5vdWdoLWNoaXBtdW5rLTkyLmNsZXJrLmFjY291bnRzLmRldiQ';

	// Use process.env for server-side access to environment variables
	// Fallback to hardcoded value from /gftd env clerk
	const clerkPublishableKey =
		process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
		process.env.CLERK_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
		HARDCODED_PUBLISHABLE_KEY;

	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();
	
	// Log detailed auth state for debugging
	console.log('[Layout Server] Auth state:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
		authKeys: Object.keys(auth),
		authObject: JSON.stringify(auth, null, 2),
	});

	if (!clerkPublishableKey || clerkPublishableKey === '') {
		console.error(
			'[Clerk] PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY is not set. Using hardcoded fallback.'
		);
		return {
			clerkPublishableKey: HARDCODED_PUBLISHABLE_KEY,
			...buildClerkProps(auth),
		};
	}

	const clerkProps = buildClerkProps(auth);
	
	// Log buildClerkProps output for debugging
	console.log('[Layout Server] buildClerkProps result:', {
		hasInitialState: !!clerkProps.initialState,
		initialStateKeys: clerkProps.initialState ? Object.keys(clerkProps.initialState) : [],
		initialStatePreview: clerkProps.initialState ? JSON.stringify(clerkProps.initialState, null, 2) : null,
	});
	
	return {
		clerkPublishableKey,
		...clerkProps,
	};
};
