/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/performance-tests
 * 
 * Performance Tests for GraphQL API
 * Tests response times and throughput
 */
import { describe, it, expect } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
const client = new GraphQLClient(GRAPHQL_API_URL);

// Performance thresholds
const MAX_RESPONSE_TIME_MS = 1000; // 1 second for simple queries
const MAX_MUTATION_TIME_MS = 2000; // 2 seconds for mutations
const MAX_CONCURRENT_REQUESTS = 10;

describe('GraphQL API Performance', () => {
	it('should respond to health check within threshold', async () => {
		const startTime = performance.now();
		const query = `query { health }`;
		const result = await client.request(query);
		const endTime = performance.now();
		const responseTime = endTime - startTime;

		expect(result.health).toBe('ok');
		expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
	});

	it('should handle multiple concurrent queries efficiently', async () => {
		const query = `query { health }`;
		const requests = Array.from({ length: MAX_CONCURRENT_REQUESTS }, () =>
			client.request(query)
		);

		const startTime = performance.now();
		const results = await Promise.all(requests);
		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTimePerRequest = totalTime / MAX_CONCURRENT_REQUESTS;

		expect(results.length).toBe(MAX_CONCURRENT_REQUESTS);
		expect(results.every((r) => r.health === 'ok')).toBe(true);
		expect(avgTimePerRequest).toBeLessThan(MAX_RESPONSE_TIME_MS);
	});

	it('should handle project list query within threshold', async () => {
		const startTime = performance.now();
		const query = `
			query {
				projects {
					id
					title
					description
				}
			}
		`;
		const result = await client.request(query);
		const endTime = performance.now();
		const responseTime = endTime - startTime;

		expect(result.projects).toBeDefined();
		expect(Array.isArray(result.projects)).toBe(true);
		expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
	});

	it('should handle project creation mutation within threshold', async () => {
		const startTime = performance.now();
		const mutation = `
			mutation CreateProject($input: CreateProjectInput!) {
				createProject(input: $input) {
					id
					title
					description
				}
			}
		`;
		const result = await client.request(mutation, {
			input: {
				title: 'Performance Test Project',
				description: 'Test project for performance testing',
			},
		});
		const endTime = performance.now();
		const responseTime = endTime - startTime;

		expect(result.createProject).toBeDefined();
		expect(result.createProject.id).toBeDefined();
		expect(responseTime).toBeLessThan(MAX_MUTATION_TIME_MS);
	});

	it('should handle complex query with nested data efficiently', async () => {
		const startTime = performance.now();
		// First get projects
		const projectsQuery = `query { projects { id title } }`;
		const projectsResult = await client.request(projectsQuery);
		
		// Then get storyboards for first project if available
		if (projectsResult.projects && projectsResult.projects.length > 0) {
			const projectId = projectsResult.projects[0].id;
			const storyboardsQuery = `
				query ListStoryboards($projectId: ID!) {
					storyboards(projectId: $projectId) {
						id
						title
					}
				}
			`;
			await client.request(storyboardsQuery, { projectId });
		}
		
		const endTime = performance.now();
		const responseTime = endTime - startTime;

		expect(projectsResult.projects).toBeDefined();
		expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS * 2); // Allow more time for complex queries
	});

	it('should maintain consistent performance under load', async () => {
		const query = `query { health }`;
		const iterations = 20;
		const responseTimes: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now();
			await client.request(query);
			const endTime = performance.now();
			responseTimes.push(endTime - startTime);
		}

		const avgTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
		const maxTime = Math.max(...responseTimes);
		const minTime = Math.min(...responseTimes);

		expect(avgTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
		expect(maxTime).toBeLessThan(MAX_RESPONSE_TIME_MS * 2); // Allow some variance
		expect(minTime).toBeGreaterThan(0);
	});

	it('should handle batch mutations efficiently', async () => {
		const mutation = `
			mutation CreateProject($input: CreateProjectInput!) {
				createProject(input: $input) {
					id
					title
				}
			}
		`;
		const batchSize = 5;
		const mutations = Array.from({ length: batchSize }, (_, i) =>
			client.request(mutation, {
				input: {
					title: `Batch Test Project ${i + 1}`,
					description: `Batch test project ${i + 1}`,
				},
			})
		);

		const startTime = performance.now();
		const results = await Promise.all(mutations);
		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTimePerMutation = totalTime / batchSize;

		expect(results.length).toBe(batchSize);
		expect(results.every((r) => r.createProject?.id)).toBe(true);
		expect(avgTimePerMutation).toBeLessThan(MAX_MUTATION_TIME_MS);
	});

	it('should handle sequential queries efficiently', async () => {
		const query = `query { projects { id title } }`;
		const sequentialCount = 10;
		const responseTimes: number[] = [];

		for (let i = 0; i < sequentialCount; i++) {
			const startTime = performance.now();
			await client.request(query);
			const endTime = performance.now();
			responseTimes.push(endTime - startTime);
		}

		const avgTime = responseTimes.reduce((a, b) => a + b, 0) / sequentialCount;
		const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(sequentialCount * 0.95)];

		expect(avgTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
		expect(p95Time).toBeLessThan(MAX_RESPONSE_TIME_MS * 1.5); // 95th percentile should be reasonable
	});

	it('should handle large result sets efficiently', async () => {
		// Create multiple projects first
		const createMutation = `
			mutation CreateProject($input: CreateProjectInput!) {
				createProject(input: $input) {
					id
					title
				}
			}
		`;
		const createCount = 10;
		for (let i = 0; i < createCount; i++) {
			await client.request(createMutation, {
				input: {
					title: `Large Set Project ${i + 1}`,
					description: `Project ${i + 1} for large result set test`,
				},
			});
		}

		// Query all projects
		const startTime = performance.now();
		const query = `query { projects { id title description } }`;
		const result = await client.request(query);
		const endTime = performance.now();
		const responseTime = endTime - startTime;

		expect(result.projects).toBeDefined();
		expect(result.projects.length).toBeGreaterThanOrEqual(createCount);
		expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME_MS * 2); // Allow more time for larger results
	});

	it('should handle error cases without performance degradation', async () => {
		const invalidQuery = `query { invalidField }`;
		const errorResponseTimes: number[] = [];
		const iterations = 5;

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now();
			try {
				await client.request(invalidQuery);
			} catch (error) {
				// Expected error
			}
			const endTime = performance.now();
			errorResponseTimes.push(endTime - startTime);
		}

		const avgErrorTime = errorResponseTimes.reduce((a, b) => a + b, 0) / iterations;
		// Error responses should still be fast (fail fast principle)
		expect(avgErrorTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
	});

	it('should handle mixed query and mutation workload', async () => {
		const query = `query { projects { id title } }`;
		const mutation = `
			mutation CreateProject($input: CreateProjectInput!) {
				createProject(input: $input) {
					id
					title
				}
			}
		`;

		const workload: Array<() => Promise<unknown>> = [];
		// Mix of queries and mutations
		for (let i = 0; i < 5; i++) {
			workload.push(() => client.request(query));
			workload.push(() =>
				client.request(mutation, {
					input: {
						title: `Mixed Workload Project ${i}`,
						description: `Mixed workload test ${i}`,
					},
				})
			);
		}

		const startTime = performance.now();
		const results = await Promise.all(workload.map((fn) => fn()));
		const endTime = performance.now();
		const totalTime = endTime - startTime;
		const avgTimePerOperation = totalTime / workload.length;

		expect(results.length).toBe(workload.length);
		expect(avgTimePerOperation).toBeLessThan(Math.max(MAX_RESPONSE_TIME_MS, MAX_MUTATION_TIME_MS));
	});
});

