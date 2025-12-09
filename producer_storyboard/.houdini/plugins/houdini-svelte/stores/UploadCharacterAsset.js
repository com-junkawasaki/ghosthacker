import artifact from '$houdini/artifacts/UploadCharacterAsset'
import { MutationStore } from '../runtime/stores/mutation'

export class UploadCharacterAssetStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
