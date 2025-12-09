import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListHumeVoices'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListHumeVoicesStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListHumeVoicesStore",
			variables: false,
		})
	}
}

export async function load_ListHumeVoices(params) {
  await initClient()

	const store = new ListHumeVoicesStore()

	await store.fetch(params)

	return {
		ListHumeVoices: store,
	}
}
