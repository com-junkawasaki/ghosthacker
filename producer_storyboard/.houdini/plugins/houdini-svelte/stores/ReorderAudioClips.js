import artifact from '$houdini/artifacts/ReorderAudioClips'
import { MutationStore } from '../runtime/stores/mutation'

export class ReorderAudioClipsStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
