import artifact from '$houdini/artifacts/CreateAudioClip'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateAudioClipStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
