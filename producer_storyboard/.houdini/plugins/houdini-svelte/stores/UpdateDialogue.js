import artifact from '$houdini/artifacts/UpdateDialogue'
import { MutationStore } from '../runtime/stores/mutation'

export class UpdateDialogueStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
