import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListScenarios'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListScenariosStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListScenariosStore",
			variables: true,
		})
	}
}

export async function load_ListScenarios(params) {
  await initClient()

	const store = new ListScenariosStore()

	await store.fetch(params)

	return {
		ListScenarios: store,
	}
}
