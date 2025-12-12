import { CreateProjectStore } from "../plugins/houdini-svelte/stores/CreateProject";
import { ConvertScenarioToStoryboardStore } from "../plugins/houdini-svelte/stores/ConvertScenarioToStoryboard";
import { CreateCharacterStore } from "../plugins/houdini-svelte/stores/CreateCharacter";
import { CreateEpisodeStore } from "../plugins/houdini-svelte/stores/CreateEpisode";
import { CreateAudioClipStore } from "../plugins/houdini-svelte/stores/CreateAudioClip";
import { CreateAudioTrackStore } from "../plugins/houdini-svelte/stores/CreateAudioTrack";
import { CreateStoryboardStore } from "../plugins/houdini-svelte/stores/CreateStoryboard";
import { CreateComposerStore } from "../plugins/houdini-svelte/stores/CreateComposer";
import { CreateDialogueStore } from "../plugins/houdini-svelte/stores/CreateDialogue";
import { CreateScenarioStore } from "../plugins/houdini-svelte/stores/CreateScenario";
import { CreatePartStore } from "../plugins/houdini-svelte/stores/CreatePart";
import { CreateScenePlanStore } from "../plugins/houdini-svelte/stores/CreateScenePlan";
import { DeleteCharacterStore } from "../plugins/houdini-svelte/stores/DeleteCharacter";
import { CreateSceneStore } from "../plugins/houdini-svelte/stores/CreateScene";
import { DeleteCharacterAssetStore } from "../plugins/houdini-svelte/stores/DeleteCharacterAsset";
import { DeleteDialogueStore } from "../plugins/houdini-svelte/stores/DeleteDialogue";
import { DeleteAudioClipStore } from "../plugins/houdini-svelte/stores/DeleteAudioClip";
import { DeleteScenarioStore } from "../plugins/houdini-svelte/stores/DeleteScenario";
import { DeleteSceneStore } from "../plugins/houdini-svelte/stores/DeleteScene";
import { GenerateSunoMusicStore } from "../plugins/houdini-svelte/stores/GenerateSunoMusic";
import { GenerateDialogueAudioStore } from "../plugins/houdini-svelte/stores/GenerateDialogueAudio";
import { ReorderScenePlansStore } from "../plugins/houdini-svelte/stores/ReorderScenePlans";
import { GenerateVideoStore } from "../plugins/houdini-svelte/stores/GenerateVideo";
import { ReorderEpisodesStore } from "../plugins/houdini-svelte/stores/ReorderEpisodes";
import { GenerateSceneImageStore } from "../plugins/houdini-svelte/stores/GenerateSceneImage";
import { ReorderAudioClipsStore } from "../plugins/houdini-svelte/stores/ReorderAudioClips";
import { UpdateAudioClipStore } from "../plugins/houdini-svelte/stores/UpdateAudioClip";
import { ReorderPartsStore } from "../plugins/houdini-svelte/stores/ReorderParts";
import { ReorderScenesStore } from "../plugins/houdini-svelte/stores/ReorderScenes";
import { TranslateDialogueStore } from "../plugins/houdini-svelte/stores/TranslateDialogue";
import { UpdateSceneStore } from "../plugins/houdini-svelte/stores/UpdateScene";
import { GetCharacterAssetDataStore } from "../plugins/houdini-svelte/stores/GetCharacterAssetData";
import { UpdateCharacterStore } from "../plugins/houdini-svelte/stores/UpdateCharacter";
import { UpdateScenarioStore } from "../plugins/houdini-svelte/stores/UpdateScenario";
import { UploadSceneImageStore } from "../plugins/houdini-svelte/stores/UploadSceneImage";
import { UpdateDialogueStore } from "../plugins/houdini-svelte/stores/UpdateDialogue";
import { UploadCharacterAssetStore } from "../plugins/houdini-svelte/stores/UploadCharacterAsset";
import { GetComposerStore } from "../plugins/houdini-svelte/stores/GetComposer";
import { ListCharacterAssetsStore } from "../plugins/houdini-svelte/stores/ListCharacterAssets";
import { GetScenarioStore } from "../plugins/houdini-svelte/stores/GetScenario";
import { GetGeneratedImagesStore } from "../plugins/houdini-svelte/stores/GetGeneratedImages";
import { ListAudioTracksStore } from "../plugins/houdini-svelte/stores/ListAudioTracks";
import { ListAudioClipsStore } from "../plugins/houdini-svelte/stores/ListAudioClips";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListCharactersStore } from "../plugins/houdini-svelte/stores/ListCharacters";
import { ListComposersStore } from "../plugins/houdini-svelte/stores/ListComposers";
import { ListScenariosStore } from "../plugins/houdini-svelte/stores/ListScenarios";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListDialoguesStore } from "../plugins/houdini-svelte/stores/ListDialogues";
import { ListHumeVoicesStore } from "../plugins/houdini-svelte/stores/ListHumeVoices";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListSunoMusicStore } from "../plugins/houdini-svelte/stores/ListSunoMusic";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";
import type { Cache as InternalCache } from "./cache/cache";
import type { CacheTypeDef } from "./generated";
import { Cache } from "./public";
export * from "./client";
export * from "./lib";

export function graphql(
    str: "mutation CreateProject($input: CreateProjectInput!) {\n\tcreateProject(input: $input) {\n\t\tid\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateProjectStore;

export function graphql(
    str: "mutation ConvertScenarioToStoryboard($input: ConvertScenarioToStoryboardInput!) {\n\tconvertScenarioToStoryboard(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ConvertScenarioToStoryboardStore;

export function graphql(
    str: "mutation CreateCharacter($input: CreateCharacterInput!) {\n\tcreateCharacter(input: $input) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateCharacterStore;

export function graphql(
    str: "mutation CreateEpisode($input: CreateEpisodeInput!) {\n\tcreateEpisode(input: $input) {\n\t\tid\n\t\tscenarioId\n\t\ttitle\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateEpisodeStore;

export function graphql(
    str: "mutation CreateAudioClip($input: CreateAudioClipInput!) {\n\tcreateAudioClip(input: $input) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateAudioClipStore;

export function graphql(
    str: "mutation CreateAudioTrack($input: CreateAudioTrackInput!) {\n\tcreateAudioTrack(input: $input) {\n\t\tid\n\t\tcomposerId\n\t\ttrackNumber\n\t\ttrackType\n\t\tname\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateAudioTrackStore;

export function graphql(
    str: "mutation CreateStoryboard($input: CreateStoryboardInput!) {\n\tcreateStoryboard(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateStoryboardStore;

export function graphql(
    str: "mutation CreateComposer($input: CreateComposerInput!) {\n\tcreateComposer(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateComposerStore;

export function graphql(
    str: "mutation CreateDialogue($input: CreateDialogueInput!) {\n\tcreateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): CreateDialogueStore;

export function graphql(
    str: "mutation CreateScenario($input: CreateScenarioInput!) {\n\tcreateScenario(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateScenarioStore;

export function graphql(
    str: "mutation CreatePart($input: CreatePartInput!) {\n\tcreatePart(input: $input) {\n\t\tid\n\t\tepisodeId\n\t\ttitle\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreatePartStore;

export function graphql(
    str: "mutation CreateScenePlan($input: CreateScenePlanInput!) {\n\tcreateScenePlan(input: $input) {\n\t\tid\n\t\tpartId\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateScenePlanStore;

export function graphql(
    str: "mutation DeleteCharacter($id: ID!) {\n\tdeleteCharacter(id: $id)\n}\n\n\n"
): DeleteCharacterStore;

export function graphql(
    str: "mutation CreateScene($input: CreateSceneInput!) {\n\tcreateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): CreateSceneStore;

export function graphql(
    str: "mutation DeleteCharacterAsset($assetId: ID!) {\n\tdeleteCharacterAsset(assetId: $assetId)\n}\n\n\n"
): DeleteCharacterAssetStore;

export function graphql(
    str: "mutation DeleteDialogue($id: ID!) {\n\tdeleteDialogue(id: $id)\n}\n\n\n"
): DeleteDialogueStore;

export function graphql(
    str: "mutation DeleteAudioClip($id: ID!) {\n\tdeleteAudioClip(id: $id)\n}\n\n"
): DeleteAudioClipStore;

export function graphql(str: "mutation DeleteScenario($id: ID!) {\n\tdeleteScenario(id: $id)\n}\n"): DeleteScenarioStore;
export function graphql(str: "mutation DeleteScene($id: ID!) {\n\tdeleteScene(id: $id)\n}\n\n\n"): DeleteSceneStore;

export function graphql(
    str: "mutation GenerateSunoMusic($input: GenerateSunoMusicInput!) {\n\tgenerateSunoMusic(input: $input) {\n\t\tid\n\t\tcomposerId\n\t\tprompt\n\t\tstatus\n\t\taudioUrl\n\t\taudioDataId\n\t\ttaskId\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): GenerateSunoMusicStore;

export function graphql(
    str: "mutation GenerateDialogueAudio($dialogueId: ID!) {\n\tgenerateDialogueAudio(dialogueId: $dialogueId) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): GenerateDialogueAudioStore;

export function graphql(
    str: "mutation ReorderScenePlans($input: ReorderScenePlansInput!) {\n\treorderScenePlans(input: $input) {\n\t\tid\n\t\tpartId\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ReorderScenePlansStore;

export function graphql(
    str: "mutation GenerateVideo($storyboardId: ID!) {\n\tgenerateVideo(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tstatus\n\t\tcreatedAt\n\t}\n}\n"
): GenerateVideoStore;

export function graphql(
    str: "mutation ReorderEpisodes($input: ReorderEpisodesInput!) {\n\treorderEpisodes(input: $input) {\n\t\tid\n\t\tscenarioId\n\t\ttitle\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ReorderEpisodesStore;

export function graphql(
    str: "mutation GenerateSceneImage($input: GenerateSceneImageInput!) {\n\tgenerateSceneImage(input: $input) {\n\t\tid\n\t\tsceneId\n\t\topenaiImageId\n\t\timageFormat\n\t\timageType\n\t\tprompt\n\t\tmodel\n\t\tcreatedAt\n\t}\n}\n\n"
): GenerateSceneImageStore;

export function graphql(
    str: "mutation ReorderAudioClips($trackId: ID!, $clipIds: [ID!]!) {\n\treorderAudioClips(trackId: $trackId, clipIds: $clipIds) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ReorderAudioClipsStore;

export function graphql(
    str: "mutation UpdateAudioClip($input: UpdateAudioClipInput!) {\n\tupdateAudioClip(input: $input) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): UpdateAudioClipStore;

export function graphql(
    str: "mutation ReorderParts($input: ReorderPartsInput!) {\n\treorderParts(input: $input) {\n\t\tid\n\t\tepisodeId\n\t\ttitle\n\t\tdescription\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ReorderPartsStore;

export function graphql(
    str: "mutation ReorderScenes($input: ReorderScenesInput!) {\n\treorderScenes(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ReorderScenesStore;

export function graphql(
    str: "mutation TranslateDialogue($input: TranslateDialogueInput!) {\n\ttranslateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): TranslateDialogueStore;

export function graphql(
    str: "mutation UpdateScene($input: UpdateSceneInput!) {\n\tupdateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UpdateSceneStore;

export function graphql(
    str: "query GetCharacterAssetData($assetId: ID!) {\n\tcharacterAssetData(assetId: $assetId)\n}\n\n\n"
): GetCharacterAssetDataStore;

export function graphql(
    str: "mutation UpdateCharacter($input: UpdateCharacterInput!) {\n\tupdateCharacter(input: $input) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): UpdateCharacterStore;

export function graphql(
    str: "mutation UpdateScenario($input: UpdateScenarioInput!) {\n\tupdateScenario(input: $input) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): UpdateScenarioStore;

export function graphql(
    str: "mutation UploadSceneImage($sceneId: ID!, $imageData: String!, $imageType: String, $imageFormat: String) {\n\tuploadSceneImage(input: { sceneId: $sceneId, imageData: $imageData, imageType: $imageType, imageFormat: $imageFormat }) {\n\t\tid\n\t\tsceneId\n\t\timageType\n\t\timageFormat\n\t\tcreatedAt\n\t}\n}\n\n\n"
): UploadSceneImageStore;

export function graphql(
    str: "mutation UpdateDialogue($input: UpdateDialogueInput!) {\n\tupdateDialogue(input: $input) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UpdateDialogueStore;

export function graphql(
    str: "mutation UploadCharacterAsset($input: UploadCharacterAssetInput!) {\n\tuploadCharacterAsset(input: $input) {\n\t\tid\n\t\tcharacterId\n\t\tassetType\n\t\tassetFormat\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): UploadCharacterAssetStore;

export function graphql(
    str: "query GetComposer($id: ID!) {\n\tcomposer(id: $id) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): GetComposerStore;

export function graphql(
    str: "query ListCharacterAssets($characterId: ID!) {\n\tcharacterAssets(characterId: $characterId) {\n\t\tid\n\t\tcharacterId\n\t\tassetType\n\t\tassetFormat\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): ListCharacterAssetsStore;

export function graphql(
    str: "query GetScenario($id: ID!) {\n\tscenario(id: $id) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t\tepisodes {\n\t\t\tid\n\t\t\tscenarioId\n\t\t\ttitle\n\t\t\tdescription\n\t\t\torderIndex\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t\tparts {\n\t\t\t\tid\n\t\t\t\tepisodeId\n\t\t\t\ttitle\n\t\t\t\tdescription\n\t\t\t\torderIndex\n\t\t\t\tcreatedAt\n\t\t\t\tupdatedAt\n\t\t\t\tscenePlans {\n\t\t\t\t\tid\n\t\t\t\t\tpartId\n\t\t\t\t\tdescription\n\t\t\t\t\torderIndex\n\t\t\t\t\tcreatedAt\n\t\t\t\t\tupdatedAt\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}\n"
): GetScenarioStore;

export function graphql(
    str: "query GetGeneratedImages($sceneId: ID!) {\n\tgeneratedImages(sceneId: $sceneId) {\n\t\tid\n\t\tsceneId\n\t\topenaiImageId\n\t\timageFormat\n\t\timageType\n\t\tprompt\n\t\tmodel\n\t\tcreatedAt\n\t}\n}\n\n\n"
): GetGeneratedImagesStore;

export function graphql(
    str: "query ListAudioTracks($composerId: ID!) {\n\taudioTracks(composerId: $composerId) {\n\t\tid\n\t\tcomposerId\n\t\ttrackNumber\n\t\ttrackType\n\t\tname\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListAudioTracksStore;

export function graphql(
    str: "query ListAudioClips($trackId: ID!) {\n\taudioClips(trackId: $trackId) {\n\t\tid\n\t\ttrackId\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\taudioType\n\t\taudioUrl\n\t\taudioDataId\n\t\tmetadata\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListAudioClipsStore;

export function graphql(
    str: "query GetScene($id: ID!) {\n\tscene(id: $id) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): GetSceneStore;

export function graphql(
    str: "query ListCharacters($projectId: ID!) {\n\tcharacters(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\tname\n\t\tdescription\n\t\tpersonality\n\t\tbackground\n\t\tdefaultHumeVoiceId\n\t\tprofileImageId\n\t\tassets {\n\t\t\tid\n\t\t\tcharacterId\n\t\t\tassetType\n\t\t\tassetFormat\n\t\t\tcreatedAt\n\t\t\tupdatedAt\n\t\t}\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListCharactersStore;

export function graphql(
    str: "query ListComposers($projectId: ID!) {\n\tcomposers(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdurationSeconds\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListComposersStore;

export function graphql(
    str: "query ListScenarios($projectId: ID!) {\n\tscenarios(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListScenariosStore;

export function graphql(
    str: "query ListGeneratedVideos($storyboardId: ID!) {\n\tgeneratedVideos(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tvideoUrl\n\t\tstatus\n\t\terrorMessage\n\t\tcreatedAt\n\t}\n}\n"
): ListGeneratedVideosStore;

export function graphql(
    str: "query ListDialogues($sceneId: ID!) {\n\tdialogues(sceneId: $sceneId) {\n\t\tid\n\t\tsceneId\n\t\tcharacterId\n\t\tlanguage\n\t\ttext\n\t\ttranslatedText\n\t\thumeVoiceId\n\t\taudioUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\torderIndex\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n\n"
): ListDialoguesStore;

export function graphql(
    str: "query ListHumeVoices {\n\thumeVoices {\n\t\tid\n\t\tname\n\t\tdescription\n\t\tlanguage\n\t}\n}\n\n\n"
): ListHumeVoicesStore;

export function graphql(
    str: "query ListProjects {\n\tprojects {\n\t\tid\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ListProjectsStore;

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