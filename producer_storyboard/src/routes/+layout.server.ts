/**
 * Server-side layout load function
 * Initializes Clerk configuration
 */
import { CLERK_PUBLISHABLE_KEY } from '$env/static/public';

export const load = async () => {
	return {
		clerkPublishableKey: CLERK_PUBLISHABLE_KEY || '',
	};
};
