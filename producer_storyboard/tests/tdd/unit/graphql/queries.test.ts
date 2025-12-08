/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-graphql-queries-tests
 * 
 * TDD Unit Tests for GraphQL Queries
 * Based on capabilities.jsonld
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('GraphQL Queries', () => {
	const queriesDir = join(process.cwd(), 'src/lib/graphql/queries');

	it('should have ListProjects query', () => {
		const query = readFileSync(join(queriesDir, 'ListProjects.gql'), 'utf-8');
		expect(query).toContain('query');
		expect(query).toContain('projects');
		expect(query).toContain('id');
		expect(query).toContain('title');
	});

	it('should have ListStoryboards query', () => {
		const query = readFileSync(join(queriesDir, 'ListStoryboards.gql'), 'utf-8');
		expect(query).toContain('query');
		expect(query).toContain('storyboards');
		expect(query).toContain('projectId');
	});

	it('should have ListScenes query', () => {
		const query = readFileSync(join(queriesDir, 'ListScenes.gql'), 'utf-8');
		expect(query).toContain('query');
		expect(query).toContain('scenes');
		expect(query).toContain('storyboardId');
	});

	it('should have GetScene query', () => {
		const query = readFileSync(join(queriesDir, 'GetScene.gql'), 'utf-8');
		expect(query).toContain('query');
		expect(query).toContain('scene');
		expect(query).toContain('id');
	});

	it('should have ListGeneratedVideos query', () => {
		const query = readFileSync(join(queriesDir, 'ListGeneratedVideos.gql'), 'utf-8');
		expect(query).toContain('query');
		expect(query).toContain('generatedVideos');
		expect(query).toContain('storyboardId');
	});
});
