import artifact from '$houdini/artifacts/GenerateSceneImage'
import { MutationStore } from '../runtime/stores/mutation'

export class GenerateSceneImageStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
