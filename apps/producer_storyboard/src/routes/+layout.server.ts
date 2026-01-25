/**
 * Server-side layout load function
 * Uses buildClerkProps to pass authentication state to client (svelte-clerk v0.20.1+)
 */
import type { LayoutServerLoad } from './$types';
import { buildClerkProps } from 'svelte-clerk/server';
import fs from 'fs';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// #region agent log
	const logPath = '/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log';
	const log = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
		const logEntry = JSON.stringify({
			location,
			message,
			data,
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			hypothesisId
		});
		try {
			fs.appendFileSync(logPath, logEntry + '\n');
		} catch (e) {
			console.error('[Layout Server] Failed to write log:', e);
		}
	};
	
	log('+layout.server.ts:30', 'Root layout load called', {
		pathname: url.pathname,
		isSignInRoute: url.pathname.startsWith('/sign-in'),
		isSSoCallback: url.pathname === '/sign-in/sso-callback'
	}, 'H2,H5');
	// #endregion
	
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
