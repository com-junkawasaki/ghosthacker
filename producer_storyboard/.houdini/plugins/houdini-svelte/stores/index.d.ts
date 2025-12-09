import type { DataSource } from '$houdini/runtime'

export type Result<DataType> = {
	isFetching: boolean
	partial: boolean
	source?: DataSource | null
	data?: DataType | null
	error?: Error | null
}
export * from './CreateCharacter'
export * from './CreateDialogue'
export * from './CreateProject'
export * from './CreateScene'
export * from './CreateStoryboard'
export * from './DeleteCharacter'
export * from './DeleteCharacterAsset'
export * from './DeleteDialogue'
export * from './DeleteScene'
export * from './GenerateDialogueAudio'
export * from './GenerateSceneImage'
export * from './GenerateVideo'
export * from './GetCharacterAssetData'
export * from './GetGeneratedImages'
export * from './GetScene'
export * from './ListCharacterAssets'
export * from './ListCharacters'
export * from './ListDialogues'
export * from './ListGeneratedVideos'
export * from './ListHumeVoices'
export * from './ListProjects'
export * from './ListScenes'
export * from './ListStoryboards'
export * from './ReorderScenes'
export * from './TranslateDialogue'
export * from './UpdateCharacter'
export * from './UpdateDialogue'
export * from './UpdateScene'
export * from './UploadCharacterAsset'
export * from './UploadSceneImage'