// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

// Import svelte-clerk types
/// <reference types="svelte-clerk" />

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			clerkSession?: string;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module '$env/static/public' {
	export const CLERK_PUBLISHABLE_KEY: string;
	export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;
}

declare module '$env/static/private' {
	export const CLERK_SECRET_KEY: string;
}

export {};
