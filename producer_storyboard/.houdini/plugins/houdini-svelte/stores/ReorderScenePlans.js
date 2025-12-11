import artifact from '$houdini/artifacts/ReorderScenePlans'
import { MutationStore } from '../runtime/stores/mutation'

export class ReorderScenePlansStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
