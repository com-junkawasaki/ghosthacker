import artifact from '$houdini/artifacts/ReorderScenes'
import { MutationStore } from '../runtime/stores/mutation'

export class ReorderScenesStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
