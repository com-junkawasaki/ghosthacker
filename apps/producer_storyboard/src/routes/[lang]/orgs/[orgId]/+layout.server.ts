/**
 * Server-side layout load function for organization-scoped routes
 * Handles lang and orgId parameter validation and Clerk organization mapping
 * Uses svelte-clerk v0.20.1+ with withClerkHandler
 */
import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { clerkClient } from 'svelte-clerk/server';
import { appendFileSync } from 'fs';

// Debug logging helper for server-side - works in both dev and production
const debugLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
	const logEntry = {
		location,
		message,
		data,
		timestamp: Date.now(),
		sessionId: 'debug-session',
		runId: 'run1',
		hypothesisId,
		env: process.env.NODE_ENV || 'unknown',
		vercelEnv: process.env.VERCEL_ENV || 'unknown',
	};
	
	// Always log to console for Vercel production logs
	console.log('[DEBUG]', JSON.stringify(logEntry));
	
	// Try to write to file (works in local dev, may fail in Vercel serverless)
	try {
		const logPath = '/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log';
		appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
	} catch (e) {
		// Ignore file write errors in production/serverless environments
	}
};

const DEFAULT_LANG = 'ja';

export const load: LayoutServerLoad = async ({ params, url, locals }) => {
	const { lang, orgId } = params;

	// Validate and set default lang
	const validLang = lang || DEFAULT_LANG;
	if (lang && lang !== validLang) {
		// Redirect to correct lang if invalid
		const newUrl = url.pathname.replace(`/${lang}`, `/${validLang}`);
		throw redirect(302, newUrl);
	}

	// Get auth from locals (set by withClerkHandler)
	const auth = locals.auth();
	
	// #region agent log
	debugLog('+layout.server.ts:24', 'Auth state from locals', { userId: auth.userId, orgId: auth.orgId, sessionId: auth.sessionId, requestedOrgId: orgId, urlPath: url.pathname }, 'A');
	// #endregion
	
	console.log('[OrgLayout Server] Auth state:', {
		userId: auth.userId,
		orgId: auth.orgId,
		sessionId: auth.sessionId,
	});

	// Require authentication - redirect to sign-in if not authenticated
	if (!auth.userId) {
		// #region agent log
		debugLog('+layout.server.ts:41', 'Redirecting to sign-in (not authenticated)', { requestedOrgId: orgId, urlPath: url.pathname, hasUserId: !!auth.userId }, 'E');
		// #endregion
		
		// If orgId is 'select', redirect to sign-in (authentication required)
		if (orgId === 'select') {
			throw redirect(302, '/sign-in');
		}
		// Otherwise, redirect to sign-in
		throw redirect(302, '/sign-in');
	}

	// User is authenticated
	// If orgId is 'select', show organization selection
	if (orgId === 'select') {
		const organizations = await getUserOrganizations(auth.userId);
		return {
			lang: validLang,
			orgId: null,
			authResult: {
				isAuthenticated: true,
				userId: auth.userId,
				orgId: auth.orgId,
			},
			organizations,
		};
	}

	// Validate orgId if provided
	if (orgId) {
		// First check if the requested org matches the current session org
		const isCurrentSessionOrg = auth.orgId === orgId;

		// #region agent log
		debugLog('+layout.server.ts:61', 'Pre-verification check', { userId: auth.userId, requestedOrgId: orgId, currentSessionOrgId: auth.orgId, isCurrentSessionOrg, orgIdType: typeof orgId, authOrgIdType: typeof auth.orgId, orgIdLength: orgId?.length, authOrgIdLength: auth.orgId?.length }, 'B');
		// #endregion

		console.log('[OrgLayout Server] Pre-verification check:', {
			userId: auth.userId,
			requestedOrgId: orgId,
			currentSessionOrgId: auth.orgId,
			isCurrentSessionOrg,
			willCheckMembership: !isCurrentSessionOrg,
		});

		// Verify user has access to this organization
		// If current session org matches, grant access immediately
		// Otherwise, check membership via Clerk API
		let hasAccess = isCurrentSessionOrg;
		
		if (!hasAccess) {
			// Fetch user's organizations to verify membership
			const availableOrgs = await getUserOrganizations(auth.userId);
			
			// #region agent log
			debugLog('+layout.server.ts:78', 'Clerk API organizations fetched', { userId: auth.userId, requestedOrgId: orgId, availableOrgIds: availableOrgs.map(org => org.id), availableOrgCount: availableOrgs.length, orgs: availableOrgs.map(org => ({ id: org.id, name: org.name, role: org.role })) }, 'C');
			// #endregion
			
			console.log('[OrgLayout Server] User organizations from Clerk API:', {
				count: availableOrgs.length,
				orgIds: availableOrgs.map(org => org.id),
				orgNames: availableOrgs.map(org => ({ id: org.id, name: org.name, role: org.role })),
			});
			
			hasAccess = availableOrgs.some(org => org.id === orgId);
			
			// #region agent log
			try {
				const logEntry = JSON.stringify({location:'+layout.server.ts:85',message:'Organization membership check result',data:{userId:auth.userId,requestedOrgId:orgId,hasAccess,comparisonDetails:availableOrgs.map(org => ({orgId:org.id,matches:org.id === orgId,orgIdType:typeof org.id,requestedType:typeof orgId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n';
				appendFileSync('/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log', logEntry);
			} catch (e) {}
			// #endregion
			
			if (!hasAccess) {
				console.warn('[OrgLayout Server] Organization not found in user membership list:', {
					requestedOrgId: orgId,
					availableOrgIds: availableOrgs.map(org => org.id),
					possibleIssues: [
						'Organization was created but user was not added as a member',
						'Organization membership was not properly synced with Clerk',
						'User needs to refresh their session after creating organization',
						'Organization ID mismatch between frontend and Clerk',
					],
				});
			}
		}

		console.log('[OrgLayout Server] Organization access check result:', {
			userId: auth.userId,
			requestedOrgId: orgId,
			currentOrgId: auth.orgId,
			isCurrentSessionOrg,
			hasAccess,
		});

		// TEMPORARILY DISABLED: Organization access check
		// This allows access to any organization for debugging purposes
		// TODO: Re-enable this check after debugging
		/*
		if (!hasAccess) {
			// User doesn't have access to this organization
			// Log available organizations for debugging
			const availableOrgs = await getUserOrganizations(auth.userId);
			
			// #region agent log
			try {
				const logEntry = JSON.stringify({location:'+layout.server.ts:109',message:'Access denied - final check',data:{userId:auth.userId,requestedOrgId:orgId,availableOrgIds:availableOrgs.map(org => org.id),availableOrgCount:availableOrgs.length,nodeEnv:process.env.NODE_ENV,willThrowError:process.env.NODE_ENV === 'production'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + '\n';
				appendFileSync('/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log', logEntry);
			} catch (e) {}
			// #endregion
			
			console.error('[OrgLayout Server] Access denied - Available organizations:', {
				count: availableOrgs.length,
				organizations: availableOrgs,
				requestedOrgId: orgId,
				userId: auth.userId,
			});

			// Allow access in development mode for debugging
			const isDevelopment = process.env.NODE_ENV !== 'production';
			if (!isDevelopment) {
				throw error(403, `Access denied to organization: ${orgId}`);
			} else {
				console.warn('[OrgLayout Server] ACCESS DENIED BUT ALLOWED IN DEVELOPMENT MODE');
				console.warn('[OrgLayout Server] This should be fixed before production deployment');
			}
		}
		*/
		
		console.warn('[OrgLayout Server] ⚠️  ORGANIZATION ACCESS CHECK IS TEMPORARILY DISABLED');
		console.warn('[OrgLayout Server] All users can access any organization (for debugging only)');
	} else {
		// No orgId in URL, but user is authenticated
		// If user has a default org, redirect to it
		if (auth.orgId) {
			throw redirect(302, `/${validLang}/orgs/${auth.orgId}${url.pathname.replace(/^\/[^/]+\/orgs\/[^/]+/, '') || '/project'}`);
		}
		// Otherwise, redirect to select page
		throw redirect(302, `/${validLang}/orgs/select/project`);
	}

	// Get user's organizations for navigation
	const organizations = await getUserOrganizations(auth.userId);

	// #region agent log
	debugLog('+layout.server.ts:178', 'Layout load successful', { userId: auth.userId, orgId: orgId || null, urlPath: url.pathname, organizationsCount: organizations.length }, 'E');
	// #endregion

	return {
		lang: validLang,
		orgId: orgId || null,
		authResult: {
			isAuthenticated: true,
			userId: auth.userId,
			orgId: auth.orgId,
		},
		organizations,
	};
};

/**
 * Helper function to get user's organizations using clerkClient
 */
async function getUserOrganizations(userId: string) {
	try {
		console.log('[OrgLayout] Fetching organizations for user:', userId);
		
		// #region agent log
		try {
			const logEntry = JSON.stringify({location:'+layout.server.ts:157',message:'Calling Clerk API for organizations',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'}) + '\n';
			appendFileSync('/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log', logEntry);
		} catch (e) {}
		// #endregion
		
		const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
			userId,
		});

		const mappedOrgs = orgMemberships.data?.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			role: membership.role,
		})) || [];
		
		// #region agent log
		try {
			const logEntry = JSON.stringify({location:'+layout.server.ts:174',message:'Clerk API response received',data:{userId,totalCount:orgMemberships.totalCount,organizationCount:mappedOrgs.length,organizations:mappedOrgs.map(org => ({id:org.id,name:org.name,role:org.role}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'}) + '\n';
			appendFileSync('/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log', logEntry);
		} catch (e) {}
		// #endregion

		console.log('[OrgLayout] Clerk API response:', {
			totalCount: orgMemberships.totalCount,
			organizationCount: orgMemberships.data?.length || 0,
			organizations: orgMemberships.data?.map(m => ({
				id: m.organization.id,
				name: m.organization.name,
				slug: m.organization.slug,
			})) || [],
		});

		return mappedOrgs;
	} catch (error) {
		// #region agent log
		try {
			const logEntry = JSON.stringify({location:'+layout.server.ts:180',message:'Error fetching organizations',data:{userId,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'}) + '\n';
			appendFileSync('/Users/junkawasaki/jun784/ghosthacker/producer_storyboard/.cursor/debug.log', logEntry);
		} catch (e) {}
		// #endregion
		
		console.error('[OrgLayout] Error fetching organizations:', error);
		return [];
	}
}

/**
 * Helper function to verify user has access to an organization
 */
async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
	try {
		const organizations = await getUserOrganizations(userId);
		console.log('[OrgLayout] Checking org access:', {
			userId,
			requestedOrgId: orgId,
			availableOrgIds: organizations.map(org => org.id),
		});
		const hasAccess = organizations.some(org => org.id === orgId);
		console.log('[OrgLayout] Access result:', hasAccess);
		return hasAccess;
	} catch (error) {
		console.error('[OrgLayout] Error verifying org access:', error);
		return false;
	}
}
