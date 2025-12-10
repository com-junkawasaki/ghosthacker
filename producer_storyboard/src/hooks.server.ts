/**
 * SvelteKit server hooks
 * Handles Clerk authentication using withClerkHandler (svelte-clerk v0.20.1+)
 */
import { withClerkHandler } from 'svelte-clerk/server';

export const handle = withClerkHandler();
