/**
 * SvelteKit server hooks
 * Handles Clerk authentication token forwarding to GraphQL API
 */
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Forward Clerk session token from cookies to request headers
	// This allows the GraphQL client to access Clerk authentication
	const clerkSession = event.cookies.get('__session');
	
	if (clerkSession) {
		// Store Clerk session in event.locals for use in API routes
		event.locals.clerkSession = clerkSession;
	}
	
	const response = await resolve(event);
	return response;
};
