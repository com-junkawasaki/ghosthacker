import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch, params }) => {
	const { orgId, projectId } = params;
	
	try {
		const response = await fetch(`/api/scenarios?projectId=${projectId}`, {
			headers: {
				'X-Org-Id': orgId,
			},
		});
		
		if (!response.ok) {
			throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return {
			scenarios: data.scenarios || [],
		};
	} catch (error) {
		console.error('[Scenario Load] Error:', error);
		return {
			scenarios: [],
		};
	}
};
