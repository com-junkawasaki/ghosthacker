/** TypeScript types replacing protobuf definitions. Plain interfaces for fetch-based API. */

export interface Project {
	id: string;
	name: string;
	hasStoryboard: boolean;
}

export interface Episode {
	id: string;
	title: string;
	totalPages: number;
}

export interface Arc {
	id: string;
	title: string;
	description: string;
	episodeIds: string[];
}

export interface MangaText {
	text: string;
	type: string;
	x: number;
	y: number;
	fontSize: number;
	style: string;
}

export interface MangaPanelLayout {
	panelIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
	shape: string;
	zIndex: number;
	imageX: number;
	imageY: number;
	imageScale: number;
}

export interface MangaLayout {
	panels: MangaPanelLayout[];
	texts: MangaText[];
}

export interface GeneratedImage {
	imageUrl: string;
	imagePrompt: string;
	generatedAt: number;
	model: string;
}

export interface Dialogue {
	speaker: string;
	text: string;
	mangaLayout?: MangaText | undefined;
	delivery: string;
	subtext: string;
	emotion: string;
	pauseBeforeMs: number;
	pauseAfterMs: number;
}

export interface PanelData {
	characters: string[];
	dialogue: Dialogue[];
	environment: string;
	visualNote: string;
	cameraDirection: string;
	durationSeconds: number;
	cutNumber: string;
	shot: string;
	runwayPrompt: string;
	generatedImageUrl: string;
	imagePrompt: string;
	generatedImages: GeneratedImage[];
	currentImageIndex: number;
	mangaLayout?: MangaLayout | undefined;
}

export interface Panel {
	pageNumber: number;
	panel: number;
	cutNumber: string;
	data?: PanelData;
}
