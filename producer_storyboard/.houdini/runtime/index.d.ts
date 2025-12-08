import { GetSceneStore } from "../plugins/houdini-svelte/stores/GetScene";
import { GenerateVideoStore } from "../plugins/houdini-svelte/stores/GenerateVideo";
import { ListGeneratedVideosStore } from "../plugins/houdini-svelte/stores/ListGeneratedVideos";
import { ListProjectsStore } from "../plugins/houdini-svelte/stores/ListProjects";
import { ListScenesStore } from "../plugins/houdini-svelte/stores/ListScenes";
import { ListStoryboardsStore } from "../plugins/houdini-svelte/stores/ListStoryboards";
import type { Cache as InternalCache } from "./cache/cache";
import type { CacheTypeDef } from "./generated";
import { Cache } from "./public";
export * from "./client";
export * from "./lib";

export function graphql(
    str: "query GetScene($id: ID!) {\n\tscene(id: $id) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): GetSceneStore;

export function graphql(
    str: "mutation GenerateVideo($storyboardId: ID!) {\n\tgenerateVideo(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tstatus\n\t\tcreatedAt\n\t}\n}\n"
): GenerateVideoStore;

export function graphql(
    str: "query ListGeneratedVideos($storyboardId: ID!) {\n\tgeneratedVideos(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tvariationNumber\n\t\tvideoUrl\n\t\tstatus\n\t\terrorMessage\n\t\tcreatedAt\n\t}\n}\n"
): ListGeneratedVideosStore;

export function graphql(
    str: "query ListProjects {\n\tprojects {\n\t\tid\n\t\ttitle\n\t\tdescription\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListProjectsStore;

export function graphql(
    str: "query ListScenes($storyboardId: ID!) {\n\tscenes(storyboardId: $storyboardId) {\n\t\tid\n\t\tstoryboardId\n\t\tsceneNumber\n\t\ttextDescription\n\t\tmediaType\n\t\tmediaUrl\n\t\tstartTimeSeconds\n\t\tdurationSeconds\n\t\ttransitionType\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListScenesStore;

export function graphql(
    str: "query ListStoryboards($projectId: ID!) {\n\tstoryboards(projectId: $projectId) {\n\t\tid\n\t\tprojectId\n\t\ttitle\n\t\taspectRatio\n\t\tresolution\n\t\tdurationSeconds\n\t\tnumVariations\n\t\tcreatedAt\n\t\tupdatedAt\n\t}\n}\n"
): ListStoryboardsStore;

export declare function graphql<_Payload, _Result = _Payload>(str: TemplateStringsArray): _Result;
export declare const cache: Cache<CacheTypeDef>;
export declare function getCache(): InternalCache;