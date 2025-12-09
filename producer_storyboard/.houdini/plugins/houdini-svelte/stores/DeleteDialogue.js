import artifact from '$houdini/artifacts/DeleteDialogue'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteDialogueStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
