import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListScenes'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListScenesStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListScenesStore",
			variables: true,
		})
	}
}

export async function load_ListScenes(params) {
	await initClient()

	const store = new ListScenesStore()

	await store.fetch(params)

	return {
		ListScenes: store,
	}
}
