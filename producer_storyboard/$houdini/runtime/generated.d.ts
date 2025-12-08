import type { Record } from "./public/record";
import { GetScene$result, GetScene$input } from "../artifacts/GetScene";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListProjects$result, ListProjects$input } from "../artifacts/ListProjects";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListGeneratedVideos$result, ListGeneratedVideos$input } from "../artifacts/ListGeneratedVideos";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListStoryboards$result, ListStoryboards$input } from "../artifacts/ListStoryboards";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";
import { ListScenes$result, ListScenes$input } from "../artifacts/ListScenes";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";

export declare type CacheTypeDef = {
    types: {
        Project: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                title: {
                    type: string;
                    args: never;
                };
                description: {
                    type: string | null;
                    args: never;
                };
                createdAt: {
                    type: string;
                    args: never;
                };
                updatedAt: {
                    type: string;
                    args: never;
                };
            };
            fragments: [];
        };
        Storyboard: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                projectId: {
                    type: string;
                    args: never;
                };
                title: {
                    type: string;
                    args: never;
                };
                aspectRatio: {
                    type: string;
                    args: never;
                };
                resolution: {
                    type: string;
                    args: never;
                };
                durationSeconds: {
                    type: number | null;
                    args: never;
                };
                numVariations: {
                    type: number;
                    args: never;
                };
                createdAt: {
                    type: string;
                    args: never;
                };
                updatedAt: {
                    type: string;
                    args: never;
                };
            };
            fragments: [];
        };
        Scene: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                storyboardId: {
                    type: string;
                    args: never;
                };
                sceneNumber: {
                    type: number;
                    args: never;
                };
                textDescription: {
                    type: string | null;
                    args: never;
                };
                mediaType: {
                    type: string | null;
                    args: never;
                };
                mediaUrl: {
                    type: string | null;
                    args: never;
                };
                startTimeSeconds: {
                    type: number | null;
                    args: never;
                };
                durationSeconds: {
                    type: number | null;
                    args: never;
                };
                transitionType: {
                    type: string | null;
                    args: never;
                };
                createdAt: {
                    type: string;
                    args: never;
                };
                updatedAt: {
                    type: string;
                    args: never;
                };
            };
            fragments: [];
        };
        VideoStatus: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                storyboardId: {
                    type: string;
                    args: never;
                };
                variationNumber: {
                    type: number;
                    args: never;
                };
                videoUrl: {
                    type: string | null;
                    args: never;
                };
                status: {
                    type: string;
                    args: never;
                };
                errorMessage: {
                    type: string | null;
                    args: never;
                };
                createdAt: {
                    type: string;
                    args: never;
                };
            };
            fragments: [];
        };
        __ROOT__: {
            idFields: {};
            fields: {
                projects: {
                    type: (Record<CacheTypeDef, "Project">)[];
                    args: never;
                };
                storyboards: {
                    type: (Record<CacheTypeDef, "Storyboard">)[];
                    args: {
                        projectId: string;
                    };
                };
                scenes: {
                    type: (Record<CacheTypeDef, "Scene">)[];
                    args: {
                        storyboardId: string;
                    };
                };
                scene: {
                    type: Record<CacheTypeDef, "Scene"> | null;
                    args: {
                        id: string;
                    };
                };
                generatedVideos: {
                    type: (Record<CacheTypeDef, "VideoStatus">)[];
                    args: {
                        storyboardId: string;
                    };
                };
            };
            fragments: [];
        };
    };
    lists: {};
    queries: [[ListScenesStore, ListScenes$result, ListScenes$input], [ListStoryboardsStore, ListStoryboards$result, ListStoryboards$input], [ListGeneratedVideosStore, ListGeneratedVideos$result, ListGeneratedVideos$input], [ListProjectsStore, ListProjects$result, ListProjects$input], [GetSceneStore, GetScene$result, GetScene$input]];
};