import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/GetComposer'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class GetComposerStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "GetComposerStore",
			variables: true,
		})
	}
}

export async function load_GetComposer(params) {
  await initClient()

	const store = new GetComposerStore()

	await store.fetch(params)

	return {
		GetComposer: store,
	}
}
