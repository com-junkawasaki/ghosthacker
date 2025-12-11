import artifact from '$houdini/artifacts/CreateScenario'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateScenarioStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
