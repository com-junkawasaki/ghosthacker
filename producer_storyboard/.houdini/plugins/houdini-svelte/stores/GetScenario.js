import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/GetScenario'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class GetScenarioStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "GetScenarioStore",
			variables: true,
		})
	}
}

export async function load_GetScenario(params) {
  await initClient()

	const store = new GetScenarioStore()

	await store.fetch(params)

	return {
		GetScenario: store,
	}
}
