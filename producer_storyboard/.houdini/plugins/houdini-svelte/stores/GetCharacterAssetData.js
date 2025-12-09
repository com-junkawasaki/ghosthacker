import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/GetCharacterAssetData'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class GetCharacterAssetDataStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "GetCharacterAssetDataStore",
			variables: true,
		})
	}
}

export async function load_GetCharacterAssetData(params) {
  await initClient()

	const store = new GetCharacterAssetDataStore()

	await store.fetch(params)

	return {
		GetCharacterAssetData: store,
	}
}
