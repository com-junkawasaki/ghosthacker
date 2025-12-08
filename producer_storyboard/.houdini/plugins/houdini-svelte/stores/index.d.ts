import type { DataSource } from '$houdini/runtime'

export type Result<DataType> = {
	isFetching: boolean
	partial: boolean
	source?: DataSource | null
	data?: DataType | null
	error?: Error | null
}
export * from './CreateProject'
export * from './GenerateVideo'
export * from './GetScene'
export * from './ListGeneratedVideos'
export * from './ListProjects'
export * from './ListScenes'
export * from './ListStoryboards'