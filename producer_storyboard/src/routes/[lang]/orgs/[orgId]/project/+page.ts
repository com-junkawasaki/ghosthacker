/**
 * SSR Load function for project list page
 * Fetches projects on the server using Houdini's load_ListProjects
 */
import { load_ListProjects } from '$houdini';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	// Use Houdini's load function for SSR data fetching
	// orgId is passed via X-Org-Id header in the GraphQL client
	return await load_ListProjects({
		event,
	});
};
