import artifact from '$houdini/artifacts/CreateCharacter'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateCharacterStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
