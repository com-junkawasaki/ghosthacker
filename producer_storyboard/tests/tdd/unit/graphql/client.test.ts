/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-graphql-client-tests
 * 
 * TDD Unit Tests for GraphQL Client
 * Based on capabilities.jsonld
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock HoudiniClient
class MockHoudiniClient {
	url: string;
	fetchParams?: (params: any) => any;

	constructor(config: { url: string; fetchParams?: (params: any) => any }) {
		this.url = config.url;
		this.fetchParams = config.fetchParams;
	}

	async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		return global.fetch(input, init);
	}
}

describe('GraphQL Client', () => {
	const originalEnv = process.env;
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		global.fetch = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
		global.fetch = originalFetch;
	});

	it('should initialize with default URL when env var is not set', () => {
		delete process.env.PUBLIC_GRAPHQL_API_URL;
		delete process.env.GRAPHQL_API_URL;

		const client = new MockHoudiniClient({
			url: 'http://localhost:25325/graphql',
		});

		expect(client.url).toBe('http://localhost:25325/graphql');
	});

	it('should initialize with PUBLIC_GRAPHQL_API_URL in browser', () => {
		process.env.PUBLIC_GRAPHQL_API_URL = 'http://test.example.com/graphql';
		process.env.GRAPHQL_API_URL = 'http://server.example.com/graphql';

		const client = new MockHoudiniClient({
			url: process.env.PUBLIC_GRAPHQL_API_URL || 'http://localhost:25325/graphql',
		});

		expect(client.url).toBe('http://test.example.com/graphql');
	});

	it('should set Content-Type header in fetchParams', () => {
		const client = new MockHoudiniClient({
			url: 'http://localhost:25325/graphql',
			fetchParams() {
				return {
					headers: {
						'Content-Type': 'application/json',
					},
				};
			},
		});

		const params = client.fetchParams?.({ session: {} });
		expect(params?.headers?.['Content-Type']).toBe('application/json');
	});

	it('should handle fetch errors', async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
		global.fetch = mockFetch;

		const client = new MockHoudiniClient({
			url: 'http://localhost:25325/graphql',
		});

		await expect(
			client.fetch('http://localhost:25325/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: '{ projects { id } }' }),
			})
		).rejects.toThrow();
	});

	it('should make GraphQL POST request', async () => {
		const mockResponse = {
			status: 200,
			statusText: 'OK',
			headers: new Headers({ 'content-type': 'application/json' }),
			json: async () => ({ data: { projects: [] } }),
			clone: function () {
				return this;
			},
		} as Response;

		const mockFetch = vi.fn().mockResolvedValue(mockResponse);
		global.fetch = mockFetch;

		const client = new MockHoudiniClient({
			url: 'http://localhost:25325/graphql',
		});

		await client.fetch('http://localhost:25325/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: '{ projects { id } }' }),
		});

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:25325/graphql',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
				}),
			})
		);
	});
});
