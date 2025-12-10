import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListAudioTracks'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListAudioTracksStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListAudioTracksStore",
			variables: true,
		})
	}
}

export async function load_ListAudioTracks(params) {
  await initClient()

	const store = new ListAudioTracksStore()

	await store.fetch(params)

	return {
		ListAudioTracks: store,
	}
}
