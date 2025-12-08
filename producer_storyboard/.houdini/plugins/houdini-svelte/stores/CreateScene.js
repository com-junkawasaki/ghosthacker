import artifact from '$houdini/artifacts/CreateScene'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateSceneStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
