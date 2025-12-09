import type { Record } from "./public/record";
import { ListProjects$result, ListProjects$input } from "$houdini/artifacts/ListProjects";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { GetGeneratedImages$result, GetGeneratedImages$input } from "$houdini/artifacts/GetGeneratedImages";
import { GetGeneratedImagesStore } from "../plugins/houdini-svelte/stores/GetGeneratedImages";
import { GetScene$result, GetScene$input } from "$houdini/artifacts/GetScene";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListDialogues$result, ListDialogues$input } from "$houdini/artifacts/ListDialogues";
import { ListDialoguesStore } from "../plugins/houdini-svelte/stores/ListDialogues";
import { ListCharacters$result, ListCharacters$input } from "$houdini/artifacts/ListCharacters";
import { ListCharactersStore } from "../plugins/houdini-svelte/stores/ListCharacters";
import { ListGeneratedVideos$result, ListGeneratedVideos$input } from "$houdini/artifacts/ListGeneratedVideos";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListHumeVoices$result, ListHumeVoices$input } from "$houdini/artifacts/ListHumeVoices";
import { ListHumeVoicesStore } from "../plugins/houdini-svelte/stores/ListHumeVoices";
import { ListScenes$result, ListScenes$input } from "$houdini/artifacts/ListScenes";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";
import { ListStoryboards$result, ListStoryboards$input } from "$houdini/artifacts/ListStoryboards";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";

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
        GeneratedImage: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                sceneId: {
                    type: string;
                    args: never;
                };
                openaiImageId: {
                    type: string | null;
                    args: never;
                };
                imageFormat: {
                    type: string | null;
                    args: never;
                };
                imageType: {
                    type: string | null;
                    args: never;
                };
                prompt: {
                    type: string | null;
                    args: never;
                };
                model: {
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
        OperationHistory: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                entityType: {
                    type: string;
                    args: never;
                };
                entityId: {
                    type: string;
                    args: never;
                };
                operationType: {
                    type: string;
                    args: never;
                };
                operationData: {
                    type: string;
                    args: never;
                };
                userId: {
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
        Character: {
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
                name: {
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
        Dialogue: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                sceneId: {
                    type: string;
                    args: never;
                };
                characterId: {
                    type: string;
                    args: never;
                };
                language: {
                    type: string;
                    args: never;
                };
                text: {
                    type: string;
                    args: never;
                };
                translatedText: {
                    type: string | null;
                    args: never;
                };
                humeVoiceId: {
                    type: string | null;
                    args: never;
                };
                audioUrl: {
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
                orderIndex: {
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
                        projectId: string | number;
                    };
                };
                scenes: {
                    type: (Record<CacheTypeDef, "Scene">)[];
                    args: {
                        storyboardId: string | number;
                    };
                };
                scene: {
                    type: Record<CacheTypeDef, "Scene"> | null;
                    args: {
                        id: string | number;
                    };
                };
                generatedVideos: {
                    type: (Record<CacheTypeDef, "VideoStatus">)[];
                    args: {
                        storyboardId: string | number;
                    };
                };
                generatedImages: {
                    type: (Record<CacheTypeDef, "GeneratedImage">)[];
                    args: {
                        sceneId: string | number;
                    };
                };
                imageData: {
                    type: string;
                    args: {
                        imageId: string | number;
                    };
                };
                operationHistory: {
                    type: (Record<CacheTypeDef, "OperationHistory">)[];
                    args: {
                        entityType?: string | null | undefined;
                        entityId?: string | number | null | undefined;
                    };
                };
                characters: {
                    type: (Record<CacheTypeDef, "Character">)[];
                    args: {
                        projectId: string | number;
                    };
                };
                dialogues: {
                    type: (Record<CacheTypeDef, "Dialogue">)[];
                    args: {
                        sceneId: string | number;
                    };
                };
                humeVoices: {
                    type: (Record<CacheTypeDef, "HumeVoice">)[];
                    args: never;
                };
                audioData: {
                    type: string;
                    args: {
                        dialogueId: string | number;
                    };
                };
            };
            fragments: [];
        };
        HumeVoice: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                name: {
                    type: string;
                    args: never;
                };
                description: {
                    type: string | null;
                    args: never;
                };
                language: {
                    type: string | null;
                    args: never;
                };
            };
            fragments: [];
        };
    };
    lists: {};
    queries: [[ListStoryboardsStore, ListStoryboards$result, ListStoryboards$input], [ListScenesStore, ListScenes$result, ListScenes$input], [ListHumeVoicesStore, ListHumeVoices$result, ListHumeVoices$input], [ListGeneratedVideosStore, ListGeneratedVideos$result, ListGeneratedVideos$input], [ListCharactersStore, ListCharacters$result, ListCharacters$input], [ListDialoguesStore, ListDialogues$result, ListDialogues$input], [GetSceneStore, GetScene$result, GetScene$input], [GetGeneratedImagesStore, GetGeneratedImages$result, GetGeneratedImages$input], [ListProjectsStore, ListProjects$result, ListProjects$input]];
};