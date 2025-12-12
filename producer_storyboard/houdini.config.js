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
			forceRunesMode: true, // Enable Svelte 5 runes mode
			defaultRouteBlocking: true, // SSRで読み込まれたデータがクライアントでリセットされないようにする
		},
	},
	// Fetch schema from GraphQL endpoint
	schemaPollInterval: 20000, // Poll every 20 seconds in development
};

export default config;
