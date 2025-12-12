import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch, params }) => {
	const { orgId, scenarioId } = params;
	
	try {
		const response = await fetch(`/api/scenarios/${scenarioId}`, {
			headers: {
				'X-Org-Id': orgId,
			},
		});
		
		if (!response.ok) {
			throw new Error(`Failed to fetch scenario: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return {
			scenario: data,
		};
	} catch (error) {
		console.error('[Scenario Detail Load] Error:', error);
		return {
			scenario: null,
		};
	}
};
