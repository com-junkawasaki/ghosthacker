import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListSunoMusic'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListSunoMusicStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListSunoMusicStore",
			variables: true,
		})
	}
}

export async function load_ListSunoMusic(params) {
  await initClient()

	const store = new ListSunoMusicStore()

	await store.fetch(params)

	return {
		ListSunoMusic: store,
	}
}
