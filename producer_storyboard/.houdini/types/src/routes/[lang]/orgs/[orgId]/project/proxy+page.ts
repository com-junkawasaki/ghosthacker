// @ts-nocheck
/**
 * SSR Load function for project list page
 * Fetches projects on the server using Houdini's load_ListProjects
 */
import { load_ListProjects } from '$houdini';
import type { PageLoad } from './$types';

export const load = async (event: Parameters<PageLoad>[0]) => {
	// Use Houdini's load function for SSR data fetching
	// This will automatically handle caching and hydration
	return await load_ListProjects({ event });
};
