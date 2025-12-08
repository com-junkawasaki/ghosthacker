/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/bdd-step-definitions
 * 
 * BDD Step Definitions for GraphQL API
 * Based on capabilities.jsonld
 */
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
const client = new GraphQLClient(GRAPHQL_API_URL);

let response: any;
let projectId: string;
let storyboardId: string;
let sceneId: string;
let videoId: string;

Given('GraphQL APIが起動している', async () => {
	const healthQuery = `query { health }`;
	const result = await client.request(healthQuery);
	expect(result.health).toBe('ok');
});

Given('データベースにプロジェクトが存在する', async () => {
	// テスト用プロジェクトを作成
	const createMutation = `
		mutation {
			createProject(input: {
				title: "Test Project"
				description: "Test Description"
			}) {
				id
			}
		}
	`;
	// Note: 実際の実装に合わせて調整が必要
});

Given('データベースが空である', async () => {
	// データベースをクリーンアップ
	// 実装が必要
});

Given('プロジェクトが存在する', async () => {
	// プロジェクトを作成または取得
	const query = `query { projects { id title } }`;
	const result = await client.request(query);
	expect(result.projects.length).toBeGreaterThan(0);
	projectId = result.projects[0].id;
});

Given('プロジェクトにストーリーボードが存在する', async () => {
	// ストーリーボードを作成または取得
	// 実装が必要
});

Given('ストーリーボードが存在する', async () => {
	// ストーリーボードを作成または取得
	// 実装が必要
});

Given('ストーリーボードにシーンが存在する', async () => {
	// シーンを作成または取得
	// 実装が必要
});

Given('シーンが存在する', async () => {
	// シーンを作成または取得
	// 実装が必要
});

Given('動画生成ジョブが存在する', async () => {
	// 動画生成ジョブを作成または取得
	// 実装が必要
});

When('ユーザーがプロジェクト一覧をリクエストする', async () => {
	const query = `
		query {
			projects {
				id
				title
				description
				createdAt
				updatedAt
			}
		}
	`;
	response = await client.request(query);
});

When('ユーザーが新しいプロジェクトを作成する', async () => {
	// 実装が必要（Mutationが実装され次第）
});

When('ユーザーがストーリーボード一覧をリクエストする', async () => {
	const query = `
		query ListStoryboards($projectId: ID!) {
			storyboards(projectId: $projectId) {
				id
				title
				aspectRatio
				resolution
			}
		}
	`;
	response = await client.request(query, { projectId });
});

When('ユーザーが新しいストーリーボードを作成する', async () => {
	// 実装が必要（Mutationが実装され次第）
});

When('ユーザーがシーン一覧をリクエストする', async () => {
	const query = `
		query ListScenes($storyboardId: ID!) {
			scenes(storyboardId: $storyboardId) {
				id
				sceneNumber
				textDescription
			}
		}
	`;
	response = await client.request(query, { storyboardId });
});

When('ユーザーがシーンIDでシーンを取得する', async () => {
	const query = `
		query GetScene($id: ID!) {
			scene(id: $id) {
				id
				sceneNumber
				startTimeSeconds
				durationSeconds
			}
		}
	`;
	response = await client.request(query, { id: sceneId });
});

When('ユーザーが動画生成をリクエストする', async () => {
	const mutation = `
		mutation GenerateVideo($storyboardId: ID!) {
			generateVideo(storyboardId: $storyboardId) {
				id
				status
				variationNumber
			}
		}
	`;
	response = await client.request(mutation, { storyboardId });
	videoId = response.generateVideo.id;
});

When('ユーザーが生成済み動画一覧をリクエストする', async () => {
	const query = `
		query ListGeneratedVideos($storyboardId: ID!) {
			generatedVideos(storyboardId: $storyboardId) {
				id
				status
				variationNumber
			}
		}
	`;
	response = await client.request(query, { storyboardId });
});

Then('プロジェクトのリストが返される', () => {
	expect(response.projects).toBeDefined();
	expect(Array.isArray(response.projects)).toBe(true);
});

Then('各プロジェクトにid、title、descriptionが含まれる', () => {
	expect(response.projects.length).toBeGreaterThan(0);
	const project = response.projects[0];
	expect(project.id).toBeDefined();
	expect(project.title).toBeDefined();
	expect(project.description).toBeDefined();
});

Then('プロジェクトが作成される', () => {
	expect(response.createProject).toBeDefined();
	expect(response.createProject.id).toBeDefined();
});

Then('プロジェクトIDが返される', () => {
	expect(response.createProject.id).toBeDefined();
	projectId = response.createProject.id;
});

Then('作成日時が設定される', () => {
	expect(response.createProject.createdAt).toBeDefined();
});

Then('ストーリーボードのリストが返される', () => {
	expect(response.storyboards).toBeDefined();
	expect(Array.isArray(response.storyboards)).toBe(true);
});

Then('各ストーリーボードにid、title、aspectRatio、resolutionが含まれる', () => {
	expect(response.storyboards.length).toBeGreaterThan(0);
	const storyboard = response.storyboards[0];
	expect(storyboard.id).toBeDefined();
	expect(storyboard.title).toBeDefined();
	expect(storyboard.aspectRatio).toBeDefined();
	expect(storyboard.resolution).toBeDefined();
});

Then('ストーリーボードが作成される', () => {
	expect(response.createStoryboard).toBeDefined();
	expect(response.createStoryboard.id).toBeDefined();
});

Then('ストーリーボードIDが返される', () => {
	expect(response.createStoryboard.id).toBeDefined();
	storyboardId = response.createStoryboard.id;
});

Then('シーンのリストが返される', () => {
	expect(response.scenes).toBeDefined();
	expect(Array.isArray(response.scenes)).toBe(true);
});

Then('シーンはsceneNumberでソートされる', () => {
	if (response.scenes.length > 1) {
		for (let i = 1; i < response.scenes.length; i++) {
			expect(response.scenes[i].sceneNumber).toBeGreaterThanOrEqual(
				response.scenes[i - 1].sceneNumber
			);
		}
	}
});

Then('各シーンにid、sceneNumber、textDescriptionが含まれる', () => {
	expect(response.scenes.length).toBeGreaterThan(0);
	const scene = response.scenes[0];
	expect(scene.id).toBeDefined();
	expect(scene.sceneNumber).toBeDefined();
	expect(scene.textDescription).toBeDefined();
});

Then('シーン詳細が返される', () => {
	expect(response.scene).toBeDefined();
	expect(response.scene.id).toBeDefined();
});

Then('シーンにstartTimeSeconds、durationSecondsが含まれる', () => {
	expect(response.scene.startTimeSeconds).toBeDefined();
	expect(response.scene.durationSeconds).toBeDefined();
});

Then('動画生成ジョブが作成される', () => {
	expect(response.generateVideo).toBeDefined();
	expect(response.generateVideo.id).toBeDefined();
});

Then('ステータスが{string}である', (status: string) => {
	expect(response.generateVideo.status).toBe(status);
});

Then('variationNumberが設定される', () => {
	expect(response.generateVideo.variationNumber).toBeDefined();
	expect(typeof response.generateVideo.variationNumber).toBe('number');
});

Then('動画のリストが返される', () => {
	expect(response.generatedVideos).toBeDefined();
	expect(Array.isArray(response.generatedVideos)).toBe(true);
});

Then('各動画にid、status、variationNumberが含まれる', () => {
	expect(response.generatedVideos.length).toBeGreaterThan(0);
	const video = response.generatedVideos[0];
	expect(video.id).toBeDefined();
	expect(video.status).toBeDefined();
	expect(video.variationNumber).toBeDefined();
});

