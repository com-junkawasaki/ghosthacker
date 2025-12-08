/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-mocks
 * 
 * GraphQL API mocks for testing
 */
export const mockProjects = [
	{
		id: 'project-1',
		title: 'Test Project 1',
		description: 'Test Description 1',
		createdAt: '2025-01-30T00:00:00Z',
		updatedAt: '2025-01-30T00:00:00Z',
	},
	{
		id: 'project-2',
		title: 'Test Project 2',
		description: 'Test Description 2',
		createdAt: '2025-01-30T00:00:01Z',
		updatedAt: '2025-01-30T00:00:01Z',
	},
];

export const mockStoryboards = [
	{
		id: 'storyboard-1',
		projectId: 'project-1',
		title: 'Test Storyboard 1',
		aspectRatio: '16:9',
		resolution: '1920x1080',
		durationSeconds: 60,
		numVariations: 3,
		createdAt: '2025-01-30T00:00:00Z',
		updatedAt: '2025-01-30T00:00:00Z',
	},
];

export const mockScenes = [
	{
		id: 'scene-1',
		storyboardId: 'storyboard-1',
		sceneNumber: 1,
		textDescription: 'First scene',
		mediaType: 'video',
		mediaUrl: 'https://example.com/video1.mp4',
		startTimeSeconds: 0.0,
		durationSeconds: 5.0,
		transitionType: 'cut',
		createdAt: '2025-01-30T00:00:00Z',
		updatedAt: '2025-01-30T00:00:00Z',
	},
	{
		id: 'scene-2',
		storyboardId: 'storyboard-1',
		sceneNumber: 2,
		textDescription: 'Second scene',
		mediaType: 'video',
		mediaUrl: 'https://example.com/video2.mp4',
		startTimeSeconds: 5.0,
		durationSeconds: 3.5,
		transitionType: 'fade',
		createdAt: '2025-01-30T00:00:01Z',
		updatedAt: '2025-01-30T00:00:01Z',
	},
];

export const mockGeneratedVideos = [
	{
		id: 'video-1',
		storyboardId: 'storyboard-1',
		variationNumber: 1,
		videoUrl: 'https://example.com/video1.mp4',
		status: 'completed',
		errorMessage: null,
		createdAt: '2025-01-30T00:00:00Z',
	},
	{
		id: 'video-2',
		storyboardId: 'storyboard-1',
		variationNumber: 2,
		videoUrl: null,
		status: 'processing',
		errorMessage: null,
		createdAt: '2025-01-30T00:00:01Z',
	},
];
