import artifact from '$houdini/artifacts/DeleteScene'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteSceneStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
