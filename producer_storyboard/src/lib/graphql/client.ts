import { HoudiniClient } from '$houdini';
import { browser } from '$app/environment';

const graphqlApiUrl =
	(browser ? import.meta.env.PUBLIC_GRAPHQL_API_URL : import.meta.env.GRAPHQL_API_URL) ||
	'http://localhost:25325/graphql';

export default new HoudiniClient({
	url: graphqlApiUrl,
	fetchParams({ session }) {
		return {
			headers: {
				'Content-Type': 'application/json',
			},
		};
	},
});
