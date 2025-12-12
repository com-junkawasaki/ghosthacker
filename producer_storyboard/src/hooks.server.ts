/**
 * SvelteKit server hooks
 * Handles Clerk authentication using withClerkHandler (svelte-clerk v0.20.1+)
 * 
 * Note: withClerkHandler automatically reads CLERK_SECRET_KEY and PUBLIC_CLERK_PUBLISHABLE_KEY
 * from environment variables. Make sure these are set in Vercel.
 */
import { withClerkHandler } from 'svelte-clerk/server';

// Log environment variable availability (without exposing values)
console.log('[Clerk Handler] Environment check:', {
	hasPublicClerkPublishableKey: !!process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
	hasClerkPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
	hasNextPublicClerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
});

export const handle = withClerkHandler();
