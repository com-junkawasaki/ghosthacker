import artifact from '$houdini/artifacts/CreatePart'
import { MutationStore } from '../runtime/stores/mutation'

export class CreatePartStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
