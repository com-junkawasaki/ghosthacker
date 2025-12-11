import artifact from '$houdini/artifacts/ConvertScenarioToStoryboard'
import { MutationStore } from '../runtime/stores/mutation'

export class ConvertScenarioToStoryboardStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
