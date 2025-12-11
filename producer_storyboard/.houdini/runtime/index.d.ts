import { CreateDialogueStore } from "../plugins/houdini-svelte/stores/CreateDialogue";
import { CreateProjectStore } from "../plugins/houdini-svelte/stores/CreateProject";
import { GenerateSunoMusicStore } from "../plugins/houdini-svelte/stores/GenerateSunoMusic";
import { CreateStoryboardStore } from "../plugins/houdini-svelte/stores/CreateStoryboard";
import { CreateAudioClipStore } from "../plugins/houdini-svelte/stores/CreateAudioClip";
import { CreateAudioTrackStore } from "../plugins/houdini-svelte/stores/CreateAudioTrack";
import { TranslateDialogueStore } from "../plugins/houdini-svelte/stores/TranslateDialogue";
import { CreateCharacterStore } from "../plugins/houdini-svelte/stores/CreateCharacter";
import { CreateComposerStore } from "../plugins/houdini-svelte/stores/CreateComposer";
import { CreateSceneStore } from "../plugins/houdini-svelte/stores/CreateScene";
import { DeleteCharacterStore } from "../plugins/houdini-svelte/stores/DeleteCharacter";
import { DeleteDialogueStore } from "../plugins/houdini-svelte/stores/DeleteDialogue";
import { DeleteAudioClipStore } from "../plugins/houdini-svelte/stores/DeleteAudioClip";
import { DeleteSceneStore } from "../plugins/houdini-svelte/stores/DeleteScene";
import { DeleteCharacterAssetStore } from "../plugins/houdini-svelte/stores/DeleteCharacterAsset";
import { UpdateSceneStore } from "../plugins/houdini-svelte/stores/UpdateScene";
import { GenerateSceneImageStore } from "../plugins/houdini-svelte/stores/GenerateSceneImage";
import { ReorderScenesStore } from "../plugins/houdini-svelte/stores/ReorderScenes";
import { GenerateDialogueAudioStore } from "../plugins/houdini-svelte/stores/GenerateDialogueAudio";
import { GenerateVideoStore } from "../plugins/houdini-svelte/stores/GenerateVideo";
import { ReorderAudioClipsStore } from "../plugins/houdini-svelte/stores/ReorderAudioClips";
import { UploadSceneImageStore } from "../plugins/houdini-svelte/stores/UploadSceneImage";
import { UpdateDialogueStore } from "../plugins/houdini-svelte/stores/UpdateDialogue";
import { UpdateCharacterStore } from "../plugins/houdini-svelte/stores/UpdateCharacter";
import { UpdateAudioClipStore } from "../plugins/houdini-svelte/stores/UpdateAudioClip";
import { UploadCharacterAssetStore } from "../plugins/houdini-svelte/stores/UploadCharacterAsset";
import { GetCharacterAssetDataStore } from "../plugins/houdini-svelte/stores/GetCharacterAssetData";
import { ListCharacterAssetsStore } from "../plugins/houdini-svelte/stores/ListCharacterAssets";
import { GetGeneratedImagesStore } from "../plugins/houdini-svelte/stores/GetGeneratedImages";
import { GetComposerStore } from "../plugins/houdini-svelte/stores/GetComposer";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListAudioClipsStore } from "../plugins/houdini-svelte/stores/ListAudioClips";
import { ListAudioTracksStore } from "../plugins/houdini-svelte/stores/ListAudioTracks";
import { ListDialoguesStore } from "../plugins/houdini-svelte/stores/ListDialogues";
import { ListCharactersStore } from "../plugins/houdini-svelte/stores/ListCharacters";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListComposersStore } from "../plugins/houdini-svelte/stores/ListComposers";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListHumeVoicesStore } from "../plugins/houdini-svelte/stores/ListHumeVoices";
import { ListSunoMusicStore } from "../plugins/houdini-svelte/stores/ListSunoMusic";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";
import type { Cache as InternalCache } from "./cache/cache";
import type { CacheTypeDef } from "./generated";
import { Cache } from "./public";
export * from "./client";
export * from "./lib";

export function graphql(
    str: "mutation CreateDialogue($input: CreateDialogueInput!) {\n\tcreateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): CreateDialogueStore;

export function graphql(
    str: "mutation CreateProject($input: CreateProjectInput!) {\n\tcreateProject(input: $input) {\n\t\tid\n\t\torgId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateProjectStore;

export function graphql(
    str: "mutation GenerateSunoMusic($input: GenerateSunoMusicInput!) {\n\tgenerateSunoMusic(input: $input) {\n\t\tid\n\t\tcomposerId\n\t\tprompt\n\t\tstatus\n\t\taudioUrl\n\t\taudioDataId\n\t\ttaskId\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): GenerateSunoMusicStore;

export function graphql(
    str: "mutation CreateStoryboard($input: CreateStoryboardInput!) {\n\tcreateStoryboard(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateStoryboardStore;

export function graphql(
    str: "mutation CreateAudioClip($input: CreateAudioClipInput!) {\n\tcreateAudioClip(input: $input) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateAudioClipStore;

export function graphql(
    str: "mutation CreateAudioTrack($input: CreateAudioTrackInput!) {\n\tcreateAudioTrack(input: $input) {\n\t\tid\n\t\tcomposerId\n\t\ttrackNumber\n\t\ttrackType\n\t\tname\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateAudioTrackStore;

export function graphql(
    str: "mutation TranslateDialogue($input: TranslateDialogueInput!) {\n\ttranslateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): TranslateDialogueStore;

export function graphql(
    str: "mutation CreateCharacter($input: CreateCharacterInput!) {\n\tcreateCharacter(input: $input) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateCharacterStore;

export function graphql(
    str: "mutation CreateComposer($input: CreateComposerInput!) {\n\tcreateComposer(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateComposerStore;

export function graphql(
    str: "mutation CreateScene($input: CreateSceneInput!) {\n\tcreateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): CreateSceneStore;

export function graphql(
    str: "mutation DeleteCharacter($id: ID!) {\n\tdeleteCharacter(id: $id)\n}\n\n\n"
): DeleteCharacterStore;

export function graphql(
    str: "mutation DeleteDialogue($id: ID!) {\n\tdeleteDialogue(id: $id)\n}\n\n\n"
): DeleteDialogueStore;

export function graphql(
    str: "mutation DeleteAudioClip($id: ID!) {\n\tdeleteAudioClip(id: $id)\n}\n\n"
): DeleteAudioClipStore;

export function graphql(str: "mutation DeleteScene($id: ID!) {\n\tdeleteScene(id: $id)\n}\n\n\n"): DeleteSceneStore;

export function graphql(
    str: "mutation DeleteCharacterAsset($assetId: ID!) {\n\tdeleteCharacterAsset(assetId: $assetId)\n}\n\n\n"
): DeleteCharacterAssetStore;

export function graphql(
    str: "mutation UpdateScene($input: UpdateSceneInput!) {\n\tupdateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UpdateSceneStore;

export function graphql(
    str: "mutation GenerateSceneImage($input: GenerateSceneImageInput!) {\n\tgenerateSceneImage(input: $input) {\n\t\tid\n\t\tsceneId\n\t\topenaiImageId\n\t\timageFormat\n\t\timageType\n\t\tprompt\n\t\tmodel\n\t\tcreatedAt\n\t}\n}\n\n"
): GenerateSceneImageStore;

export function graphql(
    str: "mutation ReorderScenes($input: ReorderScenesInput!) {\n\treorderScenes(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ReorderScenesStore;

export function graphql(
    str: "mutation GenerateDialogueAudio($dialogueId: ID!) {\n\tgenerateDialogueAudio(dialogueId: $dialogueId) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): GenerateDialogueAudioStore;

export function graphql(
    str: "mutation GenerateVideo($storyboardId: ID!) {\n\tgenerateVideo(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tstatus\n\t\tcreatedAt\n\t}\n}\n"
): GenerateVideoStore;

export function graphql(
    str: "mutation ReorderAudioClips($trackId: ID!, $clipIds: [ID!]!) {\n\treorderAudioClips(trackId: $trackId, clipIds: $clipIds) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ReorderAudioClipsStore;

export function graphql(
    str: "mutation UploadSceneImage($sceneId: ID!, $imageData: String!, $imageType: String, $imageFormat: String) {\n\tuploadSceneImage(input: { sceneId: $sceneId, imageData: $imageData, imageType: $imageType, imageFormat: $imageFormat }) {\n\t\tid\n\t\tsceneId\n\t\timageType\n\t\timageFormat\n\t\tcreatedAt\n\t}\n}\n\n\n"
): UploadSceneImageStore;

export function graphql(
    str: "mutation UpdateDialogue($input: UpdateDialogueInput!) {\n\tupdateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UpdateDialogueStore;

export function graphql(
    str: "mutation UpdateCharacter($input: UpdateCharacterInput!) {\n\tupdateCharacter(input: $input) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): UpdateCharacterStore;

export function graphql(
    str: "mutation UpdateAudioClip($input: UpdateAudioClipInput!) {\n\tupdateAudioClip(input: $input) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): UpdateAudioClipStore;

export function graphql(
    str: "mutation UploadCharacterAsset($input: UploadCharacterAssetInput!) {\n\tuploadCharacterAsset(input: $input) {\n\t\tid\n\t\tcharacterId\n\t\tassetType\n\t\tassetFormat\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UploadCharacterAssetStore;

export function graphql(
    str: "query GetCharacterAssetData($assetId: ID!) {\n\tcharacterAssetData(assetId: $assetId)\n}\n\n\n"
): GetCharacterAssetDataStore;

export function graphql(
    str: "query ListCharacterAssets($characterId: ID!) {\n\tcharacterAssets(characterId: $characterId) {\n\t\tid\n\t\tcharacterId\n\t\tassetType\n\t\tassetFormat\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): ListCharacterAssetsStore;

export function graphql(
    str: "query GetGeneratedImages($sceneId: ID!) {\n\tgeneratedImages(sceneId: $sceneId) {\n\t\tid\n\t\tsceneId\n\t\topenaiImageId\n\t\timageFormat\n\t\timageType\n\t\tprompt\n\t\tmodel\n\t\tcreatedAt\n\t}\n}\n\n\n"
): GetGeneratedImagesStore;

export function graphql(
    str: "query GetComposer($id: ID!) {\n\tcomposer(id: $id) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): GetComposerStore;

export function graphql(
    str: "query GetScene($id: ID!) {\n\tscene(id: $id) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): GetSceneStore;

export function graphql(
    str: "query ListAudioClips($trackId: ID!) {\n\taudioClips(trackId: $trackId) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListAudioClipsStore;

export function graphql(
    str: "query ListAudioTracks($composerId: ID!) {\n\taudioTracks(composerId: $composerId) {\n\t\tid\n\t\tcomposerId\n\t\ttrackNumber\n\t\ttrackType\n\t\tname\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListAudioTracksStore;

export function graphql(
    str: "query ListDialogues($sceneId: ID!) {\n\tdialogues(sceneId: $sceneId) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): ListDialoguesStore;

export function graphql(
    str: "query ListCharacters($projectId: ID!) {\n\tcharacters(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListCharactersStore;

export function graphql(
    str: "query ListProjects($orgId: ID!) {\n\tprojects(orgId: $orgId) {\n\t\tid\n\t\torgId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListProjectsStore;

export function graphql(
    str: "query ListComposers($projectId: ID!) {\n\tcomposers(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListComposersStore;

export function graphql(
    str: "query ListGeneratedVideos($storyboardId: ID!) {\n\tgeneratedVideos(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tvideoUrl\n\t\tstatus\n\t\terrorMessage\n\t\tcreatedAt\n\t}\n}\n"
): ListGeneratedVideosStore;

export function graphql(
    str: "query ListHumeVoices {\n\thumeVoices {\n\t\tid\n\t\tname\n\t\tdescription\n\t\tlanguage\n\t}\n}\n\n\n"
): ListHumeVoicesStore;

export function graphql(
    str: "query ListSunoMusic($composerId: ID!) {\n\tsunoMusic(composerId: $composerId) {\n\t\tid\n\t\tcomposerId\n\t\tprompt\n\t\tstatus\n\t\taudioUrl\n\t\taudioDataId\n\t\ttaskId\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListSunoMusicStore;

export function graphql(
    str: "query ListScenes($storyboardId: ID!) {\n\tscenes(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListScenesStore;

export function graphql(
    str: "query ListStoryboards($projectId: ID!) {\n\tstoryboards(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListStoryboardsStore;

export declare function graphql<_Payload, _Result = _Payload>(str: TemplateStringsArray): _Result;
export declare const cache: Cache<CacheTypeDef>;
export declare function getCache(): InternalCache;