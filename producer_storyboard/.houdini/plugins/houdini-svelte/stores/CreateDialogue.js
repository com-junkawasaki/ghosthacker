import artifact from '$houdini/artifacts/CreateDialogue'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateDialogueStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
