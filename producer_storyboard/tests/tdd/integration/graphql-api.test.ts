/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-graphql-api-tests
 * 
 * TDD Integration Tests for GraphQL API
 * Based on capabilities.jsonld
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
const client = new GraphQLClient(GRAPHQL_API_URL);

describe('GraphQL API Integration Tests', () => {
	beforeAll(async () => {
		// Health check
		const healthQuery = `query { health }`;
		try {
			const result = await client.request(healthQuery);
			expect(result.health).toBe('ok');
		} catch (error) {
			throw new Error(`GraphQL API is not available at ${GRAPHQL_API_URL}`);
		}
	});

	describe('Project Management Capability', () => {
		it('should list projects', async () => {
			const query = `
				query {
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
			expect(result.projects).toBeDefined();
			expect(Array.isArray(result.projects)).toBe(true);
		});

		it('should return projects with required fields', async () => {
			const query = `
				query {
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
			}
		});
	});

	describe('Storyboard Editing Capability', () => {
		let projectId: string;

		beforeAll(async () => {
			// Get first project for testing
			const query = `query { projects { id } }`;
			const result = await client.request(query);
			if (result.projects.length > 0) {
				projectId = result.projects[0].id;
			}
		});

		it('should list storyboards for a project', async () => {
			if (!projectId) {
				// Skip if no project exists
				return;
			}

			const query = `
				query ListStoryboards($projectId: ID!) {
					storyboards(projectId: $projectId) {
						id
						projectId
						title
						aspectRatio
						resolution
						durationSeconds
						numVariations
						createdAt
						updatedAt
					}
				}
			`;

			const result = await client.request(query, { projectId });
			expect(result.storyboards).toBeDefined();
			expect(Array.isArray(result.storyboards)).toBe(true);
		});

		it('should return storyboards with required fields', async () => {
			if (!projectId) {
				return;
			}

			const query = `
				query ListStoryboards($projectId: ID!) {
					storyboards(projectId: $projectId) {
						id
						title
						aspectRatio
						resolution
					}
				}
			`;

			const result = await client.request(query, { projectId });
			if (result.storyboards.length > 0) {
				const storyboard = result.storyboards[0];
				expect(storyboard.id).toBeDefined();
				expect(storyboard.title).toBeDefined();
				expect(storyboard.aspectRatio).toBeDefined();
				expect(storyboard.resolution).toBeDefined();
			}
		});
	});

	describe('Scene Management Capability', () => {
		let storyboardId: string;

		beforeAll(async () => {
			// Get first storyboard for testing
			const projectQuery = `query { projects { id } }`;
			const projectResult = await client.request(projectQuery);
			if (projectResult.projects.length > 0) {
				const projectId = projectResult.projects[0].id;
				const storyboardQuery = `
					query ListStoryboards($projectId: ID!) {
						storyboards(projectId: $projectId) {
							id
						}
					}
				`;
				const storyboardResult = await client.request(storyboardQuery, { projectId });
				if (storyboardResult.storyboards.length > 0) {
					storyboardId = storyboardResult.storyboards[0].id;
				}
			}
		});

		it('should list scenes for a storyboard', async () => {
			if (!storyboardId) {
				return;
			}

			const query = `
				query ListScenes($storyboardId: ID!) {
					scenes(storyboardId: $storyboardId) {
						id
						storyboardId
						sceneNumber
						textDescription
						mediaType
						mediaUrl
						startTimeSeconds
						durationSeconds
						transitionType
						createdAt
						updatedAt
					}
				}
			`;

			const result = await client.request(query, { storyboardId });
			expect(result.scenes).toBeDefined();
			expect(Array.isArray(result.scenes)).toBe(true);
		});

		it('should return scenes sorted by sceneNumber', async () => {
			if (!storyboardId) {
				return;
			}

			const query = `
				query ListScenes($storyboardId: ID!) {
					scenes(storyboardId: $storyboardId) {
						sceneNumber
					}
				}
			`;

			const result = await client.request(query, { storyboardId });
			if (result.scenes.length > 1) {
				for (let i = 1; i < result.scenes.length; i++) {
					expect(result.scenes[i].sceneNumber).toBeGreaterThanOrEqual(
						result.scenes[i - 1].sceneNumber
					);
				}
			}
		});

		it('should get a scene by ID', async () => {
			if (!storyboardId) {
				return;
			}

			// First get a scene ID
			const listQuery = `
				query ListScenes($storyboardId: ID!) {
					scenes(storyboardId: $storyboardId) {
						id
					}
				}
			`;
			const listResult = await client.request(listQuery, { storyboardId });
			if (listResult.scenes.length === 0) {
				return;
			}

			const sceneId = listResult.scenes[0].id;
			const query = `
				query GetScene($id: ID!) {
					scene(id: $id) {
						id
						storyboardId
						sceneNumber
						textDescription
						startTimeSeconds
						durationSeconds
					}
				}
			`;

			const result = await client.request(query, { id: sceneId });
			expect(result.scene).toBeDefined();
			expect(result.scene.id).toBe(sceneId);
		});
	});

	describe('AI Video Generation Capability', () => {
		let storyboardId: string;

		beforeAll(async () => {
			// Get first storyboard for testing
			const projectQuery = `query { projects { id } }`;
			const projectResult = await client.request(projectQuery);
			if (projectResult.projects.length > 0) {
				const projectId = projectResult.projects[0].id;
				const storyboardQuery = `
					query ListStoryboards($projectId: ID!) {
						storyboards(projectId: $projectId) {
							id
						}
					}
				`;
				const storyboardResult = await client.request(storyboardQuery, { projectId });
				if (storyboardResult.storyboards.length > 0) {
					storyboardId = storyboardResult.storyboards[0].id;
				}
			}
		});

		it('should generate a video', async () => {
			if (!storyboardId) {
				return;
			}

			const mutation = `
				mutation GenerateVideo($storyboardId: ID!) {
					generateVideo(storyboardId: $storyboardId) {
						id
						storyboardId
						variationNumber
						status
						createdAt
					}
				}
			`;

			const result = await client.request(mutation, { storyboardId });
			expect(result.generateVideo).toBeDefined();
			expect(result.generateVideo.id).toBeDefined();
			expect(result.generateVideo.status).toBe('pending');
			expect(result.generateVideo.variationNumber).toBeDefined();
		});

		it('should list generated videos', async () => {
			if (!storyboardId) {
				return;
			}

			const query = `
				query ListGeneratedVideos($storyboardId: ID!) {
					generatedVideos(storyboardId: $storyboardId) {
						id
						storyboardId
						variationNumber
						videoUrl
						status
						errorMessage
						createdAt
					}
				}
			`;

			const result = await client.request(query, { storyboardId });
			expect(result.generatedVideos).toBeDefined();
			expect(Array.isArray(result.generatedVideos)).toBe(true);
		});
	});
});

