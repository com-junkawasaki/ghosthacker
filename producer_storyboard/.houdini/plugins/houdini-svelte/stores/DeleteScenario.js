import artifact from '$houdini/artifacts/DeleteScenario'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteScenarioStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
