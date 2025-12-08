import artifact from '$houdini/artifacts/UpdateScene'
import { MutationStore } from '../runtime/stores/mutation'

export class UpdateSceneStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
