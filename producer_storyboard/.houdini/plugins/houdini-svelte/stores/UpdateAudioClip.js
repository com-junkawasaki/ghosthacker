import artifact from '$houdini/artifacts/UpdateAudioClip'
import { MutationStore } from '../runtime/stores/mutation'

export class UpdateAudioClipStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
