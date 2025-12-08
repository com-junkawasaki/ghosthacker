import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListStoryboards'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListStoryboardsStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListStoryboardsStore",
			variables: true,
		})
	}
}

export async function load_ListStoryboards(params) {
  await initClient()

	const store = new ListStoryboardsStore()

	await store.fetch(params)

	return {
		ListStoryboards: store,
	}
}
