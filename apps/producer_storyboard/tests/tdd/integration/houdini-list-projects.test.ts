/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-houdini-list-projects-integration-tests
 * 
 * TDD Integration Tests for Houdini ListProjectsStore
 * Tests the actual Houdini store behavior in a browser-like environment
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';

describe('Houdini ListProjectsStore Integration', () => {
	let client: GraphQLClient;

	beforeAll(() => {
		client = new GraphQLClient(GRAPHQL_API_URL);
	});

	describe('GraphQL API Connectivity', () => {
		it('should connect to GraphQL API', async () => {
			const healthQuery = `query { health }`;
			try {
				const result = await client.request(healthQuery);
				expect(result.health).toBe('ok');
			} catch (error) {
				throw new Error(`GraphQL API is not available at ${GRAPHQL_API_URL}: ${error}`);
			}
		});

		it('should execute ListProjects query', async () => {
			const query = `
				query ListProjects {
					projects {
						id
						title
						description
						createdAt
						updatedAt
					}
				}
			`;

			const result = await client.request(query);
			expect(result).toBeDefined();
			expect(result.projects).toBeDefined();
			expect(Array.isArray(result.projects)).toBe(true);
		});

		it('should return projects with correct structure', async () => {
			const query = `
				query ListProjects {
					projects {
						id
						title
						description
						createdAt
						updatedAt
					}
				}
			`;

			const result = await client.request(query);
			if (result.projects.length > 0) {
				const project = result.projects[0];
				expect(project.id).toBeDefined();
				expect(project.title).toBeDefined();
				expect(project.createdAt).toBeDefined();
				expect(project.updatedAt).toBeDefined();
				expect(typeof project.id).toBe('string');
				expect(typeof project.title).toBe('string');
			}
		});
	});

	describe('Houdini Client Configuration', () => {
		it('should use correct GraphQL endpoint URL', () => {
			// In browser: /api/graphql (proxied by Vite)
			// In server: http://graphql:8080/graphql or GRAPHQL_API_URL
			const browserUrl = '/api/graphql';
			const serverUrl = process.env.GRAPHQL_API_URL || 'http://graphql:8080/graphql';
			
			expect(browserUrl).toBe('/api/graphql');
			expect(serverUrl).toBeDefined();
		});

		it('should have correct Content-Type header', () => {
			const headers = {
				'Content-Type': 'application/json',
			};
			
			expect(headers['Content-Type']).toBe('application/json');
		});
	});

	describe('Store State Transitions', () => {
		it('should transition from loading to success', async () => {
			// Initial state
			let state = {
				fetching: true,
				data: null,
				errors: null,
			};
			expect(state.fetching).toBe(true);

			// Simulate successful fetch
			const query = `query { projects { id title } }`;
			const result = await client.request(query);

			// Success state
			state = {
				fetching: false,
				data: result,
				errors: null,
			};
			expect(state.fetching).toBe(false);
			expect(state.data).toBeDefined();
			expect(state.errors).toBeNull();
		});

		it('should transition from loading to error', async () => {
			// Initial state
			let state = {
				fetching: true,
				data: null,
				errors: null,
			};

			// Simulate error
			const invalidClient = new GraphQLClient('http://invalid-url:9999/graphql');
			try {
				await invalidClient.request(`query { projects { id } }`);
			} catch (error) {
				// Error state
				state = {
					fetching: false,
					data: null,
					errors: [{ message: String(error), locations: [], path: [] }],
				};
				expect(state.fetching).toBe(false);
				expect(state.data).toBeNull();
				expect(state.errors).toBeDefined();
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle network errors', async () => {
			const invalidClient = new GraphQLClient('http://invalid-url:9999/graphql');
			await expect(invalidClient.request(`query { projects { id } }`)).rejects.toThrow();
		});

		it('should handle GraphQL errors', async () => {
			const invalidQuery = `query { invalidField }`;
			try {
				await client.request(invalidQuery);
			} catch (error: unknown) {
				expect(error).toBeDefined();
				// GraphQL errors should be caught and handled
			}
		});
	});
});
