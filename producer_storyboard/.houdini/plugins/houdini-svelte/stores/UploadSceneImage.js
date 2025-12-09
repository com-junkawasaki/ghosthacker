import artifact from '$houdini/artifacts/UploadSceneImage'
import { MutationStore } from '../runtime/stores/mutation'

export class UploadSceneImageStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
