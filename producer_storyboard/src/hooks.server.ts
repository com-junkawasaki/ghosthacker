/**
 * SvelteKit server hooks
 * Handles Clerk authentication using withClerkHandler (svelte-clerk v0.20.1+)
 * 
 * Note: withClerkHandler automatically reads CLERK_SECRET_KEY and PUBLIC_CLERK_PUBLISHABLE_KEY
 * from environment variables. Make sure these are set in Vercel.
 */
import { withClerkHandler } from 'svelte-clerk/server';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import fs from 'fs';

// Log environment variable availability (without exposing values)
console.log('[Clerk Handler] Environment check:', {
	hasPublicClerkPublishableKey: !!process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
	hasClerkPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
	hasNextPublicClerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
	nodeEnv: process.env.NODE_ENV,
	vercelEnv: process.env.VERCEL_ENV,
});

// #region agent log
const debugHook: Handle = async ({ event, resolve }) => {
	// Only log to file if running outside Docker and path exists
	const logPath = process.env.NODE_ENV === 'development' && !process.env.DOCKER && process.env.HOME
		? `${process.env.HOME}/.cursor/debug.log`
		: null;
	
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
		
		// Always log to console
		if (process.env.NODE_ENV === 'development') {
			console.log('[Debug Hook]', logEntry);
		}
		
		// Try to log to file if path is available and accessible
		if (logPath) {
			try {
				// Ensure directory exists
				const dir = logPath.substring(0, logPath.lastIndexOf('/'));
				if (dir) {
					if (!fs.existsSync(dir)) {
						fs.mkdirSync(dir, { recursive: true });
					}
					// Check if directory is writable
					fs.accessSync(dir, fs.constants.W_OK);
					fs.appendFileSync(logPath, logEntry + '\n');
				}
			} catch (error) {
				// Silently fail - file logging is optional
				// Don't log ENOENT or EACCES errors (file/directory doesn't exist or permission denied)
				const err = error as NodeJS.ErrnoException;
				if (err.code !== 'ENOENT' && err.code !== 'EACCES') {
					console.warn('[Debug Hook] Failed to write log:', err.code, err.message);
				}
			}
		}
	};
	
	// Log incoming request (only for API routes to reduce noise)
	if (event.url.pathname.startsWith('/api/')) {
		log('hooks.server.ts:40', 'API request received', {
			url: event.url.pathname,
			method: event.request.method,
			fullUrl: event.url.href,
			isMangaApi: event.url.pathname.startsWith('/api/manga/'),
			isNovelApi: event.url.pathname.startsWith('/api/novel/'),
			headers: Object.fromEntries(event.request.headers.entries()),
			searchParams: Object.fromEntries(event.url.searchParams.entries())
		}, 'A,B,C');
	}
	
	// Check if this is a sign-in related route
	if (event.url.pathname.startsWith('/sign-in')) {
		log('hooks.server.ts:50', 'Sign-in route detected', {
			pathname: event.url.pathname,
			fullUrl: event.url.href,
			isSSoCallback: event.url.pathname === '/sign-in/sso-callback'
		}, 'H1,H3');
	}
	
	// Resolve the request
	const response = await resolve(event);
	
	// Log response
	log('hooks.server.ts:60', 'Response generated', {
		url: event.url.pathname,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries())
	}, 'H1,H4');
	
	return response;
};
// #endregion

export const handle = sequence(debugHook, withClerkHandler());
