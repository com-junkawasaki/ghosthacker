/**
 * Sign-in catch-all route server load function
 * Handles Clerk internal routes like /sign-in/factor-one
 * Redirects authenticated users to project list or organization selection (svelte-clerk v0.20.1+)
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';
import fs from 'fs';

const DEFAULT_LANG = 'ja';

export const load: PageServerLoad = async ({ locals, url, params }) => {
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
			console.error('[SignIn Catch-all] Failed to write log:', e);
		}
	};
	
	log('sign-in/[...path]/+page.server.ts:30', 'Load function called', {
		pathname: url.pathname,
		params: params,
		pathParam: params.path,
		searchParams: Object.fromEntries(url.searchParams.entries())
	}, 'H2,H4');
	// #endregion
	
	// Get auth from locals (set by withClerkHandler)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const auth = (locals as any).auth();
	
	// #region agent log
	log('sign-in/[...path]/+page.server.ts:43', 'Auth state retrieved', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
		hasAuth: !!auth
	}, 'H4');
	// #endregion
	
	console.log('[SignIn Catch-all Server] Auth state:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
	});

	// If user is already authenticated, redirect to project management page
	if (auth.userId) {
		// #region agent log
		log('sign-in/[...path]/+page.server.ts:65', 'User authenticated, checking org', {
			userId: auth.userId,
			orgId: auth.orgId,
			hasOrgId: !!auth.orgId
		}, 'H4');
		// #endregion
		
		// If user has an organization ID, redirect directly to project list
		if (auth.orgId) {
			console.log('[SignIn Catch-all] Server: User authenticated with org, redirecting to:', `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`);
			
			// #region agent log
			log('sign-in/[...path]/+page.server.ts:76', 'Redirecting to project with org', {
				targetUrl: `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`
			}, 'H4');
			// #endregion
			
			throw redirect(302, `/${DEFAULT_LANG}/orgs/${auth.orgId}/project`);
		}

		// Otherwise, check user's organizations using clerkClient
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const organizations = await (clerkClient.organizations as any).getOrganizationList({
				userId: auth.userId,
			});
			
			// #region agent log
			log('sign-in/[...path]/+page.server.ts:90', 'Organizations fetched', {
				count: organizations.data?.length || 0,
				hasData: !!organizations.data
			}, 'H4');
			// #endregion

			if (organizations.data && organizations.data.length > 0) {
				if (organizations.data.length === 1 && organizations.data[0]) {
					// User has exactly one organization, redirect to it
					console.log('[SignIn Catch-all] Server: User has one org, redirecting to:', `/${DEFAULT_LANG}/orgs/${organizations.data[0].id}/project`);
					throw redirect(302, `/${DEFAULT_LANG}/orgs/${organizations.data[0].id}/project`);
				} else {
					// User has multiple organizations, redirect to organization selection
					console.log('[SignIn Catch-all] Server: User has multiple orgs, redirecting to organization selection');
					throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
				}
			} else {
				// User has no organizations, redirect to organization selection
				console.log('[SignIn Catch-all] Server: User has no orgs, redirecting to organization selection');
				throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
			}
		} catch (error) {
			// #region agent log
			log('sign-in/[...path]/+page.server.ts:118', 'Error in org fetch/redirect', {
				error: String(error),
				errorName: (error as Error)?.name,
				errorMessage: (error as Error)?.message
			}, 'H4');
			// #endregion
			
			console.error('[SignIn Catch-all] Server: Error fetching organizations:', error);
			// If error occurs, still redirect to organization selection
			throw redirect(302, `/${DEFAULT_LANG}/orgs/select/project`);
		}
	}

	// #region agent log
	log('sign-in/[...path]/+page.server.ts:133', 'No authenticated user, rendering page', {
		pathname: url.pathname,
		isSSoCallback: url.pathname === '/sign-in/sso-callback'
	}, 'H2,H3,H4');
	// #endregion

	// User is not authenticated, allow them to sign in
	// Clerk's SignIn component will handle the internal routing (factor-one, etc.)
	return {};
};

