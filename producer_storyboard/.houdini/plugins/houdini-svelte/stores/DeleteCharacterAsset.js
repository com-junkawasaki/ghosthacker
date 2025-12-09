import artifact from '$houdini/artifacts/DeleteCharacterAsset'
import { MutationStore } from '../runtime/stores/mutation'

export class DeleteCharacterAssetStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
