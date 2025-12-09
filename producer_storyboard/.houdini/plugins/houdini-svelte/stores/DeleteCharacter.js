import artifact from '$houdini/artifacts/DeleteCharacter'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteCharacterStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
