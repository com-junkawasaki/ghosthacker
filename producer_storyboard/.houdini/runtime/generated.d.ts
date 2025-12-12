import type { Record } from "./public/record";
import { ListCharacterAssets$result, ListCharacterAssets$input } from "$houdini/artifacts/ListCharacterAssets";
import { ListCharacterAssetsStore } from "../plugins/houdini-svelte/stores/ListCharacterAssets";
import { GetCharacterAssetData$result, GetCharacterAssetData$input } from "$houdini/artifacts/GetCharacterAssetData";
import { GetCharacterAssetDataStore } from "../plugins/houdini-svelte/stores/GetCharacterAssetData";
import { GetComposer$result, GetComposer$input } from "$houdini/artifacts/GetComposer";
import { GetComposerStore } from "../plugins/houdini-svelte/stores/GetComposer";
import { ListAudioTracks$result, ListAudioTracks$input } from "$houdini/artifacts/ListAudioTracks";
import { ListAudioTracksStore } from "../plugins/houdini-svelte/stores/ListAudioTracks";
import { ListAudioClips$result, ListAudioClips$input } from "$houdini/artifacts/ListAudioClips";
import { ListAudioClipsStore } from "../plugins/houdini-svelte/stores/ListAudioClips";
import { GetGeneratedImages$result, GetGeneratedImages$input } from "$houdini/artifacts/GetGeneratedImages";
import { GetGeneratedImagesStore } from "../plugins/houdini-svelte/stores/GetGeneratedImages";
import { GetScenario$result, GetScenario$input } from "$houdini/artifacts/GetScenario";
import { GetScenarioStore } from "../plugins/houdini-svelte/stores/GetScenario";
import { GetScene$result, GetScene$input } from "$houdini/artifacts/GetScene";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListDialogues$result, ListDialogues$input } from "$houdini/artifacts/ListDialogues";
import { ListDialoguesStore } from "../plugins/houdini-svelte/stores/ListDialogues";
import { ListCharacters$result, ListCharacters$input } from "$houdini/artifacts/ListCharacters";
import { ListCharactersStore } from "../plugins/houdini-svelte/stores/ListCharacters";
import { ListGeneratedVideos$result, ListGeneratedVideos$input } from "$houdini/artifacts/ListGeneratedVideos";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListComposers$result, ListComposers$input } from "$houdini/artifacts/ListComposers";
import { ListComposersStore } from "../plugins/houdini-svelte/stores/ListComposers";
import { ListProjects$result, ListProjects$input } from "$houdini/artifacts/ListProjects";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListScenarios$result, ListScenarios$input } from "$houdini/artifacts/ListScenarios";
import { ListScenariosStore } from "../plugins/houdini-svelte/stores/ListScenarios";
import { ListSunoMusic$result, ListSunoMusic$input } from "$houdini/artifacts/ListSunoMusic";
import { ListSunoMusicStore } from "../plugins/houdini-svelte/stores/ListSunoMusic";
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
                personality: {
                    type: string | null;
                    args: never;
                };
                background: {
                    type: string | null;
                    args: never;
                };
                defaultHumeVoiceId: {
                    type: string | null;
                    args: never;
                };
                profileImageId: {
                    type: string | null;
                    args: never;
                };
                assets: {
                    type: (Record<CacheTypeDef, "CharacterAsset">)[];
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
        CharacterAsset: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                characterId: {
                    type: string;
                    args: never;
                };
                assetType: {
                    type: string;
                    args: never;
                };
                assetFormat: {
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
                characterAssets: {
                    type: (Record<CacheTypeDef, "CharacterAsset">)[];
                    args: {
                        characterId: string | number;
                    };
                };
                characterAssetData: {
                    type: string;
                    args: {
                        assetId: string | number;
                    };
                };
                composers: {
                    type: (Record<CacheTypeDef, "Composer">)[];
                    args: {
                        projectId: string | number;
                    };
                };
                composer: {
                    type: Record<CacheTypeDef, "Composer"> | null;
                    args: {
                        id: string | number;
                    };
                };
                audioTracks: {
                    type: (Record<CacheTypeDef, "AudioTrack">)[];
                    args: {
                        composerId: string | number;
                    };
                };
                audioClips: {
                    type: (Record<CacheTypeDef, "AudioClip">)[];
                    args: {
                        trackId: string | number;
                    };
                };
                sunoMusic: {
                    type: (Record<CacheTypeDef, "SunoMusic">)[];
                    args: {
                        composerId: string | number;
                    };
                };
                scenarios: {
                    type: (Record<CacheTypeDef, "Scenario">)[];
                    args: {
                        projectId: string | number;
                    };
                };
                scenario: {
                    type: Record<CacheTypeDef, "Scenario"> | null;
                    args: {
                        id: string | number;
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
        Composer: {
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
                durationSeconds: {
                    type: number | null;
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
        AudioTrack: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                composerId: {
                    type: string;
                    args: never;
                };
                trackNumber: {
                    type: number;
                    args: never;
                };
                trackType: {
                    type: string;
                    args: never;
                };
                name: {
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
        AudioClip: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                trackId: {
                    type: string;
                    args: never;
                };
                startTimeSeconds: {
                    type: number;
                    args: never;
                };
                durationSeconds: {
                    type: number;
                    args: never;
                };
                audioType: {
                    type: string;
                    args: never;
                };
                audioUrl: {
                    type: string | null;
                    args: never;
                };
                audioDataId: {
                    type: string | null;
                    args: never;
                };
                metadata: {
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
        SunoMusic: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                composerId: {
                    type: string | null;
                    args: never;
                };
                prompt: {
                    type: string;
                    args: never;
                };
                status: {
                    type: string;
                    args: never;
                };
                audioUrl: {
                    type: string | null;
                    args: never;
                };
                audioDataId: {
                    type: string | null;
                    args: never;
                };
                taskId: {
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
        Scenario: {
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
                description: {
                    type: string | null;
                    args: never;
                };
                episodes: {
                    type: (Record<CacheTypeDef, "Episode">)[];
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
        Episode: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                scenarioId: {
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
                orderIndex: {
                    type: number;
                    args: never;
                };
                parts: {
                    type: (Record<CacheTypeDef, "Part">)[];
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
        Part: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                episodeId: {
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
                orderIndex: {
                    type: number;
                    args: never;
                };
                scenePlans: {
                    type: (Record<CacheTypeDef, "ScenePlan">)[];
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
        ScenePlan: {
            idFields: {
                id: string;
            };
            fields: {
                id: {
                    type: string;
                    args: never;
                };
                partId: {
                    type: string;
                    args: never;
                };
                description: {
                    type: string;
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
    };
    lists: {};
    queries: [[ListStoryboardsStore, ListStoryboards$result, ListStoryboards$input], [ListScenesStore, ListScenes$result, ListScenes$input], [ListHumeVoicesStore, ListHumeVoices$result, ListHumeVoices$input], [ListSunoMusicStore, ListSunoMusic$result, ListSunoMusic$input], [ListScenariosStore, ListScenarios$result, ListScenarios$input], [ListProjectsStore, ListProjects$result, ListProjects$input], [ListComposersStore, ListComposers$result, ListComposers$input], [ListGeneratedVideosStore, ListGeneratedVideos$result, ListGeneratedVideos$input], [ListCharactersStore, ListCharacters$result, ListCharacters$input], [ListDialoguesStore, ListDialogues$result, ListDialogues$input], [GetSceneStore, GetScene$result, GetScene$input], [GetScenarioStore, GetScenario$result, GetScenario$input], [GetGeneratedImagesStore, GetGeneratedImages$result, GetGeneratedImages$input], [ListAudioClipsStore, ListAudioClips$result, ListAudioClips$input], [ListAudioTracksStore, ListAudioTracks$result, ListAudioTracks$input], [GetComposerStore, GetComposer$result, GetComposer$input], [GetCharacterAssetDataStore, GetCharacterAssetData$result, GetCharacterAssetData$input], [ListCharacterAssetsStore, ListCharacterAssets$result, ListCharacterAssets$input]];
};