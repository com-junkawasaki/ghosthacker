import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListAudioClips'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListAudioClipsStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListAudioClipsStore",
			variables: true,
		})
	}
}

export async function load_ListAudioClips(params) {
  await initClient()

	const store = new ListAudioClipsStore()

	await store.fetch(params)

	return {
		ListAudioClips: store,
	}
}
