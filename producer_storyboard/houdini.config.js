/** @type {import('houdini').ConfigFile} */
const config = {
	schemaPath: './schema.graphql',
	sourceGlob: 'src/**/*.{svelte,gql,graphql,ts,js}',
	scalars: {
		DateTime: {
			type: 'Date',
			unmarshal(val) {
				return new Date(val);
			},
			marshal(date) {
				return date.toISOString();
			},
		},
	},
	plugins: {
		'houdini-svelte': {
			client: './src/lib/graphql/client.ts',
		},
	},
	// Fetch schema from GraphQL endpoint
	schemaPollInterval: 20000, // Poll every 20 seconds in development
};

export default config;
