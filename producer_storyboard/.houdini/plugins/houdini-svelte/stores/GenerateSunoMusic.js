import artifact from '$houdini/artifacts/GenerateSunoMusic'
import { MutationStore } from '../runtime/stores/mutation'

export class GenerateSunoMusicStore extends MutationStore {
	constructor() {
		super({
			artifact,
		})
	}
}
