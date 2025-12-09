import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListCharacters'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListCharactersStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListCharactersStore",
			variables: true,
		})
	}
}

export async function load_ListCharacters(params) {
  await initClient()

	const store = new ListCharactersStore()

	await store.fetch(params)

	return {
		ListCharacters: store,
	}
}
