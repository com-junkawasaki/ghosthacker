import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = { lang: string; orgId: string };
type RouteId = '/[lang]/orgs/[orgId]';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type LayoutRouteId = RouteId | "/[lang]/orgs/[orgId]/profile" | "/[lang]/orgs/[orgId]/project" | "/[lang]/orgs/[orgId]/project/[projectId]/[storyboardId]/editor" | "/[lang]/orgs/[orgId]/project/[projectId]/characters" | "/[lang]/orgs/[orgId]/project/[projectId]/composer" | "/[lang]/orgs/[orgId]/project/[projectId]/editor" | "/[lang]/orgs/[orgId]/project/[projectId]/scenario" | "/[lang]/orgs/[orgId]/project/[projectId]/world" | "/[lang]/orgs/[orgId]/update"
type LayoutParams = RouteParams & { lang?: string; orgId?: string; projectId?: string; storyboardId?: string }
type LayoutServerParentData = EnsureDefined<import('../../../$houdini').LayoutServerData>;
type LayoutParentData = EnsureDefined<import('../../../$houdini').LayoutData>;
						type MakeOptional<Target, Keys extends keyof Target> = Omit<Target, Keys> & {
							[Key in Keys]?: Target[Key] | undefined | null
						}
					

export type EntryGenerator = () => Promise<Array<RouteParams>> | Array<RouteParams>;
export type LayoutServerLoad<OutputData extends OutputDataShape<LayoutServerParentData> = OutputDataShape<LayoutServerParentData>> = Kit.ServerLoad<LayoutParams, LayoutServerParentData, OutputData, LayoutRouteId>;
export type LayoutServerLoadEvent = Parameters<LayoutServerLoad>[0];
export type LayoutServerData = Expand<OptionalUnion<EnsureDefined<Kit.LoadProperties<Awaited<ReturnType<typeof import('./proxy+layout.server.js').load>>>>>>;
export type LayoutData = Expand<Expand<Omit<LayoutParentData, keyof LayoutServerData> & EnsureDefined<LayoutServerData>> & {  }>;
export type LayoutProps = { params: LayoutParams; data: LayoutData; children: import("svelte").Snippet }
export type RequestEvent = Kit.RequestEvent<RouteParams, RouteId>;