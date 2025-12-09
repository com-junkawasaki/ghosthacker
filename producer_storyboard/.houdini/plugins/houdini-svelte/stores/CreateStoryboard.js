import artifact from '$houdini/artifacts/CreateStoryboard'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateStoryboardStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
