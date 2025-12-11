import artifact from '$houdini/artifacts/CreateScenePlan'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateScenePlanStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
