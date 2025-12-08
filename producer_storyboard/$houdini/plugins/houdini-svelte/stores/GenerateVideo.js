import artifact from '$houdini/artifacts/GenerateVideo'
import { MutationStore } from '../runtime/stores/mutation'

export class GenerateVideoStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
