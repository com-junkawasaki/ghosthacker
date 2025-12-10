import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListComposers'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListComposersStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListComposersStore",
			variables: true,
		})
	}
}

export async function load_ListComposers(params) {
  await initClient()

	const store = new ListComposersStore()

	await store.fetch(params)

	return {
		ListComposers: store,
	}
}
