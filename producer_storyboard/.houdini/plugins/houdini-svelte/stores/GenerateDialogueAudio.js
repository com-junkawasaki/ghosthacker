import artifact from '$houdini/artifacts/GenerateDialogueAudio'
import { MutationStore } from '../runtime/stores/mutation'

export class GenerateDialogueAudioStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
