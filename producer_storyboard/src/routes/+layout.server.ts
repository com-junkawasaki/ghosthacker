/**
 * Server-side layout load function
 * Initializes Clerk configuration
 */
export const load = async () => {
	// Use process.env for server-side access to environment variables
	const clerkPublishableKey =
		process.env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
		process.env.CLERK_PUBLISHABLE_KEY ||
		'';

	return {
		clerkPublishableKey,
	};
};
