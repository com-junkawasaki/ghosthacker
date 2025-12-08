import artifact from '$houdini/artifacts/CreateProject'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateProjectStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
