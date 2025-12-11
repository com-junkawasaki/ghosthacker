// @ts-nocheck
import { GetScenarioStore } from '../../../../../../../../../../.houdini/plugins/houdini-svelte/stores/GetScenario.js';
import type { PageLoad } from './$types';

export const ssr = false;

export const load = async (event: Parameters<PageLoad>[0]) => {
	const { scenarioId } = event.params;
	
	const GetScenario = new GetScenarioStore();
	
	await GetScenario.fetch({
		event,
		variables: {
			id: scenarioId,
		},
	});
	
	return {
		GetScenario,
	};
};
