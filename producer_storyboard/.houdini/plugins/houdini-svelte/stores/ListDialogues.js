import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListDialogues'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListDialoguesStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListDialoguesStore",
			variables: true,
		})
	}
}

export async function load_ListDialogues(params) {
  await initClient()

	const store = new ListDialoguesStore()

	await store.fetch(params)

	return {
		ListDialogues: store,
	}
}
