/**
 * Server-side Clerk authentication utilities
 * Uses @clerk/backend to verify sessions and organization access
 */
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

// Hardcoded value from /gftd env clerk as fallback
const HARDCODED_SECRET_KEY = 'sk_test_FmPI35dNxAij0tuaX7rV5PDIDVmVvx8J11nyVyxEGu';

// Use process.env for server-side access to environment variables
// Fallback to hardcoded value from /gftd env clerk
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || HARDCODED_SECRET_KEY;

if (!CLERK_SECRET_KEY || CLERK_SECRET_KEY === '') {
	console.warn('[Clerk] CLERK_SECRET_KEY is not set. Using hardcoded fallback.');
} else if (CLERK_SECRET_KEY === HARDCODED_SECRET_KEY && !process.env.CLERK_SECRET_KEY) {
	console.log('[Clerk] Using hardcoded CLERK_SECRET_KEY from /gftd env clerk');
}

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export interface ClerkAuthResult {
	userId: string | null;
	orgId: string | null;
	isAuthenticated: boolean;
	hasOrg: boolean;
}

/**
 * Verify Clerk session from request cookies or headers
 * Returns authentication and organization information
 * 
 * Can accept either a RequestEvent or individual cookies and request
 */
export async function verifyClerkSession(
	eventOrCookies: RequestEvent | Cookies,
	request?: Request
): Promise<ClerkAuthResult> {
	try {
		// Handle both RequestEvent and individual cookies/request
		let cookies: Cookies;
		let req: Request;
		
		if ('cookies' in eventOrCookies && 'request' in eventOrCookies) {
			// It's a RequestEvent
			cookies = eventOrCookies.cookies;
			req = eventOrCookies.request;
		} else if (request) {
			// It's Cookies and Request separately
			cookies = eventOrCookies as Cookies;
			req = request;
		} else {
			// Fallback: try to use as Cookies only
			cookies = eventOrCookies as Cookies;
			req = new Request('http://localhost');
		}

		// Get session token from cookie or Authorization header
		// Clerk uses __session cookie for session tokens
		// Note: __clerk_db_jwt and __clerk_js_version are not session tokens
		const sessionToken =
			cookies.get('__session') ||
			req.headers.get('authorization')?.replace('Bearer ', '');

		// Debug: Log cookie check (always log for debugging)
		const allCookies = cookies.getAll ? cookies.getAll() : [];
		const cookieNames = Array.isArray(allCookies) 
			? allCookies.map((c: { name: string }) => c.name) 
			: Object.keys(allCookies);
		console.log('[Clerk verifySession] Cookie check:', {
			hasSessionCookie: !!cookies.get('__session'),
			sessionTokenPreview: sessionToken?.substring(0, 50) + '...',
			hasAuthHeader: !!req.headers.get('authorization'),
			hasSessionToken: !!sessionToken,
			allCookieNames: cookieNames,
		});

		if (!sessionToken) {
			return {
				userId: null,
				orgId: null,
				isAuthenticated: false,
				hasOrg: false,
			};
		}

		// Verify the session token using verifyToken
		// Clerk session tokens are JWTs that need to be verified
		const { data: payload, errors } = await verifyToken(sessionToken, {
			secretKey: CLERK_SECRET_KEY,
		});

		// Type guard for payload with sub property
		type PayloadWithSub = { sub: string; org_id?: string };
		const typedPayload = payload as PayloadWithSub | null;

		// Log verification result
		console.log('[Clerk verifySession] Token verification result:', {
			hasPayload: !!typedPayload,
			hasErrors: !!errors,
			errors: errors ? JSON.stringify(errors) : null,
			userId: typedPayload?.sub || null,
			orgId: typedPayload?.org_id || null,
		});

		if (errors || !typedPayload || !typedPayload.sub) {
			console.log('[Clerk verifySession] Authentication failed:', { errors });
			return {
				userId: null,
				orgId: null,
				isAuthenticated: false,
				hasOrg: false,
			};
		}

		const userId = typedPayload.sub;

		// Get organization ID from token payload or request headers
		// Clerk JWT tokens can contain organization information
		const orgId =
			(typedPayload.org_id as string | undefined) ||
			req.headers.get('x-org-id') ||
			null;

		// If orgId is provided, verify the user has access to it
		if (orgId) {
			const hasAccess = await verifyOrgAccess(userId, orgId);
			if (!hasAccess) {
				return {
					userId,
					orgId: null,
					isAuthenticated: true,
					hasOrg: false,
				};
			}
		}

		return {
			userId,
			orgId,
			isAuthenticated: true,
			hasOrg: !!orgId,
		};
	} catch (error) {
		console.error('[Clerk] Error verifying session:', error);
		return {
			userId: null,
			orgId: null,
			isAuthenticated: false,
			hasOrg: false,
		};
	}
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(userId: string) {
	try {
		const orgMemberships = await clerkClient.users.getOrganizationMembershipList({
			userId,
		});

		return orgMemberships.data?.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			role: membership.role,
		})) || [];
	} catch (error) {
		console.error('[Clerk] Error fetching user organizations:', error);
		return [];
	}
}

/**
 * Verify that a user has access to a specific organization
 * Checks if the user is a member of the organization by fetching user's organizations
 */
export async function verifyOrgAccess(
	userId: string,
	orgId: string
): Promise<boolean> {
	try {
		// Get user's organization memberships
		const userOrgs = await getUserOrganizations(userId);
		
		// Check if the requested orgId is in the user's organizations
		return userOrgs.some((org) => org.id === orgId);
	} catch (error) {
		console.error('[Clerk] Error verifying organization access:', error);
		return false;
	}
}
