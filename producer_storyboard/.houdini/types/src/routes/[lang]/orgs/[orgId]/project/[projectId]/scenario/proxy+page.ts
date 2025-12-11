// @ts-nocheck
import { ListScenariosStore } from '$houdini';
import type { PageLoad } from './$types';

export const ssr = false;

export const load = async (event: Parameters<PageLoad>[0]) => {
	const { projectId } = event.params;
	
	const ListScenarios = new ListScenariosStore();
	
	await ListScenarios.fetch({
		event,
		variables: {
			projectId: projectId,
		},
	});
	
	return {
		ListScenarios,
	};
};
