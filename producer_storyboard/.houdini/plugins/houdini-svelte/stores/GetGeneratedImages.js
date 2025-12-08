import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/GetGeneratedImages'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class GetGeneratedImagesStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "GetGeneratedImagesStore",
			variables: true,
		})
	}
}

export async function load_GetGeneratedImages(params) {
  await initClient()

	const store = new GetGeneratedImagesStore()

	await store.fetch(params)

	return {
		GetGeneratedImages: store,
	}
}
