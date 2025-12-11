import artifact from '$houdini/artifacts/ReorderEpisodes'
import { MutationStore } from '../runtime/stores/mutation'

export class ReorderEpisodesStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
