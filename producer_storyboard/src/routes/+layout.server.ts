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

	if (!clerkPublishableKey) {
		console.error(
			'[Clerk] PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY is not set. Clerk authentication will not work.'
		);
	}

	return {
		clerkPublishableKey,
	};
};
