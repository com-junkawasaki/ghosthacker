import artifact from '$houdini/artifacts/UpdateScenario'
import { MutationStore } from '../runtime/stores/mutation'

export class UpdateScenarioStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
