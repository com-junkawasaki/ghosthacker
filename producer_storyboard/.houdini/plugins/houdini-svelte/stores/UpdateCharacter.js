import artifact from '$houdini/artifacts/UpdateCharacter'
import { MutationStore } from '../runtime/stores/mutation'

export class UpdateCharacterStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
