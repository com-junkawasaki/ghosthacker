import { ListScenariosStore } from '$houdini';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async (event) => {
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
