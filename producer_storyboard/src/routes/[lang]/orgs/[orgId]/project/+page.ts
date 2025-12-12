/**
 * SSR Load function for project list page
 * Uses grpc-go API instead of GraphQL
 */
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const { orgId } = params;
	
	try {
		const response = await fetch('/api/projects', {
			headers: {
				'X-Org-Id': orgId,
			},
		});
		
		if (!response.ok) {
			throw new Error(`Failed to fetch projects: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return {
			projects: data.projects || [],
		};
	} catch (error) {
		console.error('[Project Load] Error:', error);
		return {
			projects: [],
		};
	}
};
