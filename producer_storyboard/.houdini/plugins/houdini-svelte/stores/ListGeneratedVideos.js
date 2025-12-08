import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListGeneratedVideos'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListGeneratedVideosStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListGeneratedVideosStore",
			variables: true,
		})
	}
}

export async function load_ListGeneratedVideos(params) {
  await initClient()

	const store = new ListGeneratedVideosStore()

	await store.fetch(params)

	return {
		ListGeneratedVideos: store,
	}
}
