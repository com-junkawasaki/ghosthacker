import artifact from '$houdini/artifacts/CreateAudioTrack'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateAudioTrackStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
