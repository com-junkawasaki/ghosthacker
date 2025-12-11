import artifact from '$houdini/artifacts/ReorderParts'
import { MutationStore } from '../runtime/stores/mutation'

export class ReorderPartsStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
