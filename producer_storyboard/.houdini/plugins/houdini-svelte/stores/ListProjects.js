import { QueryStore } from '../runtime/stores/query'
import artifact from '$houdini/artifacts/ListProjects'
import { initClient } from '$houdini/plugins/houdini-svelte/runtime/client'

export class ListProjectsStore extends QueryStore {
	constructor() {
		super({
			artifact,
			storeName: "ListProjectsStore",
			variables: true,
		})
	}
}

export async function load_ListProjects(params) {
  await initClient()

	const store = new ListProjectsStore()

	await store.fetch(params)

	return {
		ListProjects: store,
	}
}
