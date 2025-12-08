/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-graphql-mutations-tests
 * 
 * TDD Unit Tests for GraphQL Mutations
 * Based on capabilities.jsonld
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('GraphQL Mutations', () => {
	const mutationsDir = join(process.cwd(), 'src/lib/graphql/mutations');

	it('should have GenerateVideo mutation', () => {
		const mutation = readFileSync(join(mutationsDir, 'GenerateVideo.gql'), 'utf-8');
		expect(mutation).toContain('mutation');
		expect(mutation).toContain('generateVideo');
		expect(mutation).toContain('storyboardId');
		expect(mutation).toContain('id');
		expect(mutation).toContain('status');
	});
});
