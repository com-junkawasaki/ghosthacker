import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/GetScene'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class GetSceneStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "GetSceneStore",
			variables: true,
		})
	}
}

export async function load_GetScene(params) {
	await initClient()

	const store = new GetSceneStore()

	await store.fetch(params)

	return {
		GetScene: store,
	}
}
