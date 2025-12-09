/**
 * Server-side Clerk authentication utilities
 * Uses @clerk/backend to verify sessions and organization access
 */
import { createClerkClient } from '@clerk/backend';
import { CLERK_SECRET_KEY } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

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
 */
export async function verifyClerkSession(
	event: RequestEvent
): Promise<ClerkAuthResult> {
	try {
		// Get session token from cookie or Authorization header
		const sessionToken =
			event.cookies.get('__session') ||
			event.request.headers.get('authorization')?.replace('Bearer ', '');

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
		const payload = await clerkClient.verifyToken(sessionToken, {
			secretKey: CLERK_SECRET_KEY,
		});

		if (!payload || !payload.sub) {
			return {
				userId: null,
				orgId: null,
				isAuthenticated: false,
				hasOrg: false,
			};
		}

		const userId = payload.sub;

		// Get organization ID from token payload or request headers
		// Clerk JWT tokens can contain organization information
		const orgId =
			(payload.org_id as string | undefined) ||
			event.request.headers.get('x-org-id') ||
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
