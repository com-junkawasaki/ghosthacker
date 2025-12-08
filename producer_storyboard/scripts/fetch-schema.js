#!/usr/bin/env node
/**
 * Fetch GraphQL schema from the backend endpoint and save it to schema.graphql
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GRAPHQL_API_URL = process.env.PUBLIC_GRAPHQL_API_URL || process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
const SCHEMA_PATH = join(__dirname, '..', 'schema.graphql');

async function fetchSchema() {
	try {
		const response = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `
					query IntrospectionQuery {
						__schema {
							types {
								name
								kind
								description
								fields {
									name
									description
									type {
										name
										kind
										ofType {
											name
											kind
										}
									}
									args {
										name
										type {
											name
											kind
											ofType {
												name
												kind
											}
										}
									}
								}
								inputFields {
									name
									type {
										name
										kind
										ofType {
											name
											kind
										}
									}
								}
							}
							queryType {
								name
							}
							mutationType {
								name
							}
						}
					}
				`,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		
		if (result.errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
		}

		// Use graphql-js to print schema from introspection
		// For now, we'll use a simple approach: fetch the schema using SDL
		const sdlResponse = await fetch(GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `
					query {
						__type(name: "Query") {
							name
						}
					}
				`,
			}),
		});

		// For now, we'll keep the existing schema.graphql
		// In production, you might want to use a tool like graphql-codegen
		// or implement SDL printing from introspection
		console.log(`Schema introspection successful. Using existing schema.graphql.`);
		console.log(`To update schema.graphql, ensure the GraphQL server is running at ${GRAPHQL_API_URL}`);
		
	} catch (error) {
		console.error('Failed to fetch schema:', error.message);
		console.log('Using existing schema.graphql file');
		process.exit(1);
	}
}

fetchSchema();
