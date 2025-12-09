import artifact from '$houdini/artifacts/TranslateDialogue'
import { MutationStore } from '../runtime/stores/mutation'

export class TranslateDialogueStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
