import artifact from '$houdini/artifacts/DeleteAudioClip'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteAudioClipStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
