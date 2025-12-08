import { GenerateSceneImageStore } from "../plugins/houdini-svelte/stores/GenerateSceneImage";
import { GenerateVideoStore } from "../plugins/houdini-svelte/stores/GenerateVideo";
import { CreateProjectStore } from "../plugins/houdini-svelte/stores/CreateProject";
import { DeleteSceneStore } from "../plugins/houdini-svelte/stores/DeleteScene";
import { ReorderScenesStore } from "../plugins/houdini-svelte/stores/ReorderScenes";
import { CreateSceneStore } from "../plugins/houdini-svelte/stores/CreateScene";
import { UpdateSceneStore } from "../plugins/houdini-svelte/stores/UpdateScene";
import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";
import type { Cache as InternalCache } from "./cache/cache";
import type { CacheTypeDef } from "./generated";
import { Cache } from "./public";
export * from "./client";
export * from "./lib";

export function graphql(
    str: "mutation GenerateSceneImage($input: GenerateSceneImageInput!) {\n\tgenerateSceneImage(input: $input) {\n\t\tid\n\t\tsceneId\n\t\topenaiImageId\n\t\timageFormat\n\t\tprompt\n\t\tmodel\n\t\tcreatedAt\n\t}\n}\n\n"
): GenerateSceneImageStore;

export function graphql(
    str: "mutation GenerateVideo($storyboardId: ID!) {\n\tgenerateVideo(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tstatus\n\t\tcreatedAt\n\t}\n}\n"
): GenerateVideoStore;

export function graphql(
    str: "mutation CreateProject($input: CreateProjectInput!) {\n\tcreateProject(input: $input) {\n\t\tid\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): CreateProjectStore;

export function graphql(str: "mutation DeleteScene($id: ID!) {\n\tdeleteScene(id: $id)\n}\n\n"): DeleteSceneStore;

export function graphql(
    str: "mutation ReorderScenes($input: ReorderScenesInput!) {\n\treorderScenes(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): ReorderScenesStore;

export function graphql(
    str: "mutation CreateScene($input: CreateSceneInput!) {\n\tcreateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): CreateSceneStore;

export function graphql(
    str: "mutation UpdateScene($input: UpdateSceneInput!) {\n\tupdateScene(input: $input) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n\n"
): UpdateSceneStore;

export function graphql(
    str: "query GetScene($id: ID!) {\n\tscene(id: $id) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): GetSceneStore;

export function graphql(
    str: "query ListProjects {\n\tprojects {\n\t\tid\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListProjectsStore;

export function graphql(
    str: "query ListGeneratedVideos($storyboardId: ID!) {\n\tgeneratedVideos(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tvideoUrl\n\t\tstatus\n\t\terrorMessage\n\t\tcreatedAt\n\t}\n}\n"
): ListGeneratedVideosStore;

export function graphql(
    str: "query ListScenes($storyboardId: ID!) {\n\tscenes(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListScenesStore;

export function graphql(
    str: "query ListStoryboards($projectId: ID!) {\n\tstoryboards(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListStoryboardsStore;

export declare function graphql<_Payload, _Result = _Payload>(str: TemplateStringsArray): _Result;
export declare const cache: Cache<CacheTypeDef>;
export declare function getCache(): InternalCache;