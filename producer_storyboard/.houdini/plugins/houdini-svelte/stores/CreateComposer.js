import artifact from '$houdini/artifacts/CreateComposer'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateComposerStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
