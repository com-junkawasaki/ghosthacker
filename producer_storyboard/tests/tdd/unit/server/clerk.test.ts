/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-clerk-server-tests
 * 
 * TDD Unit Tests for Clerk Server Functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

// Mock @clerk/backend
const mockGetOrganizationMembershipList = vi.fn();
const mockVerifyToken = vi.fn();
const mockCreateClerkClient = vi.fn(() => ({
	users: {
		getOrganizationMembershipList: mockGetOrganizationMembershipList,
	},
}));

vi.mock('@clerk/backend', () => ({
	createClerkClient: () => mockCreateClerkClient(),
	verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

describe('Clerk Server Functions', () => {
	const originalEnv = process.env;
	const mockCookies = {
		get: vi.fn(),
	} as unknown as Cookies;
	const mockRequest = new Request('http://localhost', {
		headers: {
			authorization: 'Bearer test-token',
			'x-org-id': 'test-org-id',
		},
	});

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv, CLERK_SECRET_KEY: 'test-secret-key' };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('verifyClerkSession', () => {
		it('should return unauthenticated when no session token', async () => {
			const { verifyClerkSession } = await import('$lib/server/clerk');
			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

			const result = await verifyClerkSession(mockCookies, mockRequest);

			expect(result.isAuthenticated).toBe(false);
			expect(result.userId).toBeNull();
			expect(result.orgId).toBeNull();
		});

		it('should handle RequestEvent parameter', async () => {
			const { verifyClerkSession } = await import('$lib/server/clerk');
			const mockEvent = {
				cookies: mockCookies,
				request: mockRequest,
			} as unknown as RequestEvent;

			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('test-session-token');

			mockVerifyToken.mockResolvedValue({
				data: { sub: 'user-123', org_id: 'org-456' },
				errors: null,
			});
			mockGetOrganizationMembershipList.mockResolvedValue({
				data: [
					{
						organization: { id: 'org-456', name: 'Org 456', slug: 'org-456' },
						role: 'admin',
					},
				],
			});

			const result = await verifyClerkSession(mockEvent);

			expect(result.isAuthenticated).toBe(true);
			expect(result.userId).toBe('user-123');
			expect(result.orgId).toBe('org-456');
		});

		it('should extract orgId from headers when not in token', async () => {
			const { verifyClerkSession } = await import('$lib/server/clerk');
			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('test-session-token');

			mockVerifyToken.mockResolvedValue({
				data: { sub: 'user-123' },
				errors: null,
			});
			mockGetOrganizationMembershipList.mockResolvedValue({
				data: [
					{
						organization: { id: 'header-org-id', name: 'Header Org', slug: 'header-org' },
						role: 'admin',
					},
				],
			});

			const requestWithOrgHeader = new Request('http://localhost', {
				headers: {
					authorization: 'Bearer test-token',
					'x-org-id': 'header-org-id',
				},
			});

			const result = await verifyClerkSession(mockCookies, requestWithOrgHeader);

			expect(result.isAuthenticated).toBe(true);
			expect(result.userId).toBe('user-123');
			expect(result.orgId).toBe('header-org-id');
		});

		it('should handle token verification errors', async () => {
			const { verifyClerkSession } = await import('$lib/server/clerk');
			(mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue('invalid-token');

			mockVerifyToken.mockResolvedValue({
				data: null,
				errors: ['Invalid token'],
			});

			const result = await verifyClerkSession(mockCookies, mockRequest);

			expect(result.isAuthenticated).toBe(false);
			expect(result.userId).toBeNull();
		});
	});

	describe('getUserOrganizations', () => {
		it('should return user organizations', async () => {
			const { getUserOrganizations } = await import('$lib/server/clerk');
			const userId = 'user-123';

			mockGetOrganizationMembershipList.mockResolvedValue({
				data: [
					{
						organization: {
							id: 'org-1',
							name: 'Org 1',
							slug: 'org-1',
						},
						role: 'admin',
					},
					{
						organization: {
							id: 'org-2',
							name: 'Org 2',
							slug: 'org-2',
						},
						role: 'member',
					},
				],
			});

			const result = await getUserOrganizations(userId);

			expect(mockGetOrganizationMembershipList).toHaveBeenCalledWith({ userId });
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				id: 'org-1',
				name: 'Org 1',
				slug: 'org-1',
				role: 'admin',
			});
			expect(result[1]).toEqual({
				id: 'org-2',
				name: 'Org 2',
				slug: 'org-2',
				role: 'member',
			});
		});

		it('should return empty array on error', async () => {
			const { getUserOrganizations } = await import('$lib/server/clerk');
			const userId = 'user-123';

			mockGetOrganizationMembershipList.mockRejectedValue(new Error('API Error'));

			const result = await getUserOrganizations(userId);

			expect(result).toEqual([]);
		});
	});

	describe('verifyOrgAccess', () => {
		it('should return true when user has access to organization', async () => {
			const { verifyOrgAccess } = await import('$lib/server/clerk');
			const userId = 'user-123';
			const orgId = 'org-1';

			mockGetOrganizationMembershipList.mockResolvedValue({
				data: [
					{
						organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
						role: 'admin',
					},
					{
						organization: { id: 'org-2', name: 'Org 2', slug: 'org-2' },
						role: 'member',
					},
				],
			});

			const result = await verifyOrgAccess(userId, orgId);

			expect(result).toBe(true);
		});

		it('should return false when user does not have access', async () => {
			const { verifyOrgAccess } = await import('$lib/server/clerk');
			const userId = 'user-123';
			const orgId = 'org-999';

			mockGetOrganizationMembershipList.mockResolvedValue({
				data: [
					{
						organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
						role: 'admin',
					},
				],
			});

			const result = await verifyOrgAccess(userId, orgId);

			expect(result).toBe(false);
		});

		it('should return false on error', async () => {
			const { verifyOrgAccess } = await import('$lib/server/clerk');
			const userId = 'user-123';
			const orgId = 'org-1';

			mockGetOrganizationMembershipList.mockRejectedValue(new Error('API Error'));

			const result = await verifyOrgAccess(userId, orgId);

			expect(result).toBe(false);
		});
	});
});
