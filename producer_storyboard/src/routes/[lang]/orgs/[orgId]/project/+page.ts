/**
 * SSR Load function for project list page
 * Fetches projects on the server using Houdini's load_ListProjects
 */
import { load_ListProjects } from '$houdini';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	const { orgId } = event.params;
	
	// Use Houdini's load function for SSR data fetching
	// Pass orgId as a variable to filter projects by organization
	return await load_ListProjects({
		event,
		variables: { orgId },
	});
};
