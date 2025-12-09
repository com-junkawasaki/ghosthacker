import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListCharacterAssets'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListCharacterAssetsStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListCharacterAssetsStore",
			variables: true,
		})
	}
}

export async function load_ListCharacterAssets(params) {
  await initClient()

	const store = new ListCharacterAssetsStore()

	await store.fetch(params)

	return {
		ListCharacterAssets: store,
	}
}
