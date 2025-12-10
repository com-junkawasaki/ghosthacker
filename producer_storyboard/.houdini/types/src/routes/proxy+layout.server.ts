// @ts-nocheck
/**
 * Server-side layout load function
 * Uses buildClerkProps to pass authentication state to client
 * Based on svelte-clerk documentation: https://svelte-clerk.netlify.app/kit/helpers.html
 */
import type { LayoutServerLoad } from './$types';
import { buildClerkProps } from 'svelte-clerk/server';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	// Hardcoded value from /gftd env clerk as fallback
	const HARDCODED_PUBLISHABLE_KEY = 'pk_test_ZW5vdWdoLWNoaXBtdW5rLTkyLmNsZXJrLmFjY291bnRzLmRldiQ';

	// Use process.env for server-side access to environment variables
	// Fallback to hardcoded value from /gftd env clerk
	const clerkPublishableKey =
		process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
		process.env.CLERK_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
		HARDCODED_PUBLISHABLE_KEY;

	// Get auth state from locals (set by withClerkHandler)
	const auth = locals.auth();
	
	console.log('[Layout Server] Auth state from locals:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
	});

	// Use buildClerkProps to build props for ClerkProvider
	// This ensures the client-side Clerk context is properly initialized
	const clerkProps = buildClerkProps(auth);

	if (!clerkPublishableKey || clerkPublishableKey === '') {
		console.error(
			'[Clerk] PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY is not set. Using hardcoded fallback.'
		);
		return {
			clerkPublishableKey: HARDCODED_PUBLISHABLE_KEY,
			...clerkProps,
		};
	}

	return {
		clerkPublishableKey,
		...clerkProps,
	};
};
