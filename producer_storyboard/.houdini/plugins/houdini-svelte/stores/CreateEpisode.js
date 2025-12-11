import artifact from '$houdini/artifacts/CreateEpisode'
import { MutationStore } from '../runtime/stores/mutation'

export class CreateEpisodeStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
