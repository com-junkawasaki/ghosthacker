/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-create-project-mutation-tests
 * 
 * TDD Unit Tests for CreateProject GraphQL Mutation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('CreateProject GraphQL Mutation', () => {
	const mutationsDir = join(process.cwd(), 'src/lib/graphql/mutations');

	it('should have CreateProject mutation file', () => {
		const mutation = readFileSync(join(mutationsDir, 'CreateProject.gql'), 'utf-8');
		expect(mutation).toContain('mutation');
		expect(mutation).toContain('CreateProject');
		expect(mutation).toContain('createProject');
		expect(mutation).toContain('input');
		expect(mutation).toContain('title');
		expect(mutation).toContain('description');
	});

	it('should return all required project fields', () => {
		const mutation = readFileSync(join(mutationsDir, 'CreateProject.gql'), 'utf-8');
		expect(mutation).toContain('id');
		expect(mutation).toContain('title');
		expect(mutation).toContain('description');
		expect(mutation).toContain('createdAt');
		expect(mutation).toContain('updatedAt');
	});

	it('should accept CreateProjectInput with title and optional description', () => {
		const mutation = readFileSync(join(mutationsDir, 'CreateProject.gql'), 'utf-8');
		expect(mutation).toContain('CreateProjectInput');
		expect(mutation).toContain('$input');
	});
});
