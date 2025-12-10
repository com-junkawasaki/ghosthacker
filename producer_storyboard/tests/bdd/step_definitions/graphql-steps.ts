/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/bdd-step-definitions
 * 
 * BDD Step Definitions for GraphQL API
 * Based on capabilities.jsonld
 */
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql';
const client = new GraphQLClient(GRAPHQL_API_URL);

let response: any;
let projectId: string;
let storyboardId: string;
let sceneId: string;
let videoId: string;

// Temporary variables for step chaining
let projectTitle: string = '';
let projectDescription: string = '';
let storyboardTitle: string = '';
let storyboardAspectRatio: string = '';
let storyboardResolution: string = '';

Given('GraphQL APIが起動している', async () => {
	const healthQuery = `query { health }`;
	const result = await client.request(healthQuery);
	expect(result.health).to.equal('ok');
});

Given('データベースにプロジェクトが存在する', async () => {
	// テスト用プロジェクトを作成
	const createMutation = `
		mutation CreateProject($input: CreateProjectInput!) {
			createProject(input: $input) {
				id
				title
				description
			}
		}
	`;
	const result = await client.request(createMutation, {
		input: {
			title: 'Test Project',
			description: 'Test Description'
		}
	});
	expect(result.createProject).to.exist;
	expect(result.createProject.id).to.exist;
	projectId = result.createProject.id;
});

Given('データベースが空である', async () => {
	// データベースをクリーンアップ
	// Note: 実際の実装では、テスト用データベースを使用するか、
	// またはテスト後にクリーンアップすることを推奨
	// ここでは、既存のプロジェクトを確認してクリアする処理をスキップ
	// （実際のテスト環境では、テスト用データベースを使用することを推奨）
	projectId = '';
	storyboardId = '';
	sceneId = '';
	videoId = '';
});

Given('プロジェクトが存在する', async () => {
	// プロジェクトを作成または取得
	const query = `query { projects { id title } }`;
	const result = await client.request(query);
	expect(result.projects.length).to.be.greaterThan(0);
	projectId = result.projects[0].id;
});

Given('プロジェクトにストーリーボードが存在する', async () => {
	if (!projectId) {
		throw new Error('プロジェクトIDが設定されていません。先にプロジェクトを作成してください。');
	}
	
	const createMutation = `
		mutation CreateStoryboard($input: CreateStoryboardInput!) {
			createStoryboard(input: $input) {
				id
				title
			}
		}
	`;
	const result = await client.request(createMutation, {
		input: {
			projectId: projectId,
			title: 'Test Storyboard',
			aspectRatio: '16:9',
			resolution: '1920x1080'
		}
	});
	expect(result.createStoryboard).to.exist;
	expect(result.createStoryboard.id).to.exist;
	storyboardId = result.createStoryboard.id;
});

Given('ストーリーボードが存在する', async () => {
	// プロジェクトが存在しない場合は作成
	if (!projectId) {
		const createProjectMutation = `
			mutation CreateProject($input: CreateProjectInput!) {
				createProject(input: $input) {
					id
				}
			}
		`;
		const projectResult = await client.request(createProjectMutation, {
			input: {
				title: 'Test Project',
				description: 'Test Description'
			}
		});
		projectId = projectResult.createProject.id;
	}
	
	// ストーリーボードを作成
	const createMutation = `
		mutation CreateStoryboard($input: CreateStoryboardInput!) {
			createStoryboard(input: $input) {
				id
				title
			}
		}
	`;
	const result = await client.request(createMutation, {
		input: {
			projectId: projectId,
			title: 'Test Storyboard',
			aspectRatio: '16:9',
			resolution: '1920x1080'
		}
	});
	expect(result.createStoryboard).to.exist;
	expect(result.createStoryboard.id).to.exist;
	storyboardId = result.createStoryboard.id;
});

Given('ストーリーボードにシーンが存在する', async () => {
	if (!storyboardId) {
		throw new Error('ストーリーボードIDが設定されていません。先にストーリーボードを作成してください。');
	}
	
	const createMutation = `
		mutation CreateScene($input: CreateSceneInput!) {
			createScene(input: $input) {
				id
				sceneNumber
			}
		}
	`;
	const result = await client.request(createMutation, {
		input: {
			storyboardId: storyboardId,
			sceneNumber: 1,
			textDescription: 'Test Scene',
			durationSeconds: 5.0,
			startTimeSeconds: 0.0
		}
	});
	expect(result.createScene).to.exist;
	expect(result.createScene.id).to.exist;
	sceneId = result.createScene.id;
});

Given('シーンが存在する', async () => {
	// ストーリーボードが存在しない場合は作成
	if (!storyboardId) {
		if (!projectId) {
			const createProjectMutation = `
				mutation CreateProject($input: CreateProjectInput!) {
					createProject(input: $input) {
						id
					}
				}
			`;
			const projectResult = await client.request(createProjectMutation, {
				input: {
					title: 'Test Project',
					description: 'Test Description'
				}
			});
			projectId = projectResult.createProject.id;
		}
		
		const createStoryboardMutation = `
			mutation CreateStoryboard($input: CreateStoryboardInput!) {
				createStoryboard(input: $input) {
					id
				}
			}
		`;
		const storyboardResult = await client.request(createStoryboardMutation, {
			input: {
				projectId: projectId,
				title: 'Test Storyboard',
				aspectRatio: '16:9',
				resolution: '1920x1080'
			}
		});
		storyboardId = storyboardResult.createStoryboard.id;
	}
	
	// シーンを作成
	const createMutation = `
		mutation CreateScene($input: CreateSceneInput!) {
			createScene(input: $input) {
				id
				sceneNumber
			}
		}
	`;
	const result = await client.request(createMutation, {
		input: {
			storyboardId: storyboardId,
			sceneNumber: 1,
			textDescription: 'Test Scene',
			durationSeconds: 5.0,
			startTimeSeconds: 0.0
		}
	});
	expect(result.createScene).to.exist;
	expect(result.createScene.id).to.exist;
	sceneId = result.createScene.id;
});

Given('動画生成ジョブが存在する', async () => {
	if (!storyboardId) {
		throw new Error('ストーリーボードIDが設定されていません。先にストーリーボードを作成してください。');
	}
	
	const mutation = `
		mutation GenerateVideo($storyboardId: ID!) {
			generateVideo(storyboardId: $storyboardId) {
				id
				status
				variationNumber
			}
		}
	`;
	const result = await client.request(mutation, { storyboardId });
	expect(result.generateVideo).to.exist;
	expect(result.generateVideo.id).to.exist;
	videoId = result.generateVideo.id;
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
	const mutation = `
		mutation CreateProject($input: CreateProjectInput!) {
			createProject(input: $input) {
				id
				title
				description
				createdAt
				updatedAt
			}
		}
	`;
	response = await client.request(mutation, {
		input: {
			title: projectTitle || 'Test Project',
			description: projectDescription || 'Test Description'
		}
	});
	projectId = response.createProject.id;
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
	if (!projectId) {
		throw new Error('プロジェクトIDが設定されていません。先にプロジェクトを作成してください。');
	}
	
	const mutation = `
		mutation CreateStoryboard($input: CreateStoryboardInput!) {
			createStoryboard(input: $input) {
				id
				title
				aspectRatio
				resolution
				createdAt
				updatedAt
			}
		}
	`;
	response = await client.request(mutation, {
		input: {
			projectId: projectId,
			title: storyboardTitle || 'Test Storyboard',
			aspectRatio: storyboardAspectRatio || '16:9',
			resolution: storyboardResolution || '1920x1080'
		}
	});
	storyboardId = response.createStoryboard.id;
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
	expect(response.projects).to.exist;
	expect(response.projects).to.be.an('array');
});

Then('各プロジェクトにid、title、descriptionが含まれる', () => {
	expect(response.projects.length).to.be.greaterThan(0);
	const project = response.projects[0];
	expect(project.id).to.exist;
	expect(project.title).to.exist;
	expect(project.description).to.exist;
});

Then('プロジェクトが作成される', () => {
	expect(response.createProject).to.exist;
	expect(response.createProject.id).to.exist;
});

Then('プロジェクトIDが返される', () => {
	expect(response.createProject.id).to.exist;
	projectId = response.createProject.id;
});

Then('作成日時が設定される', () => {
	expect(response.createProject.createdAt).to.exist;
});

Then('ストーリーボードのリストが返される', () => {
	expect(response.storyboards).to.exist;
	expect(response.storyboards).to.be.an('array');
});

Then('各ストーリーボードにid、title、aspectRatio、resolutionが含まれる', () => {
	expect(response.storyboards.length).to.be.greaterThan(0);
	const storyboard = response.storyboards[0];
	expect(storyboard.id).to.exist;
	expect(storyboard.title).to.exist;
	expect(storyboard.aspectRatio).to.exist;
	expect(storyboard.resolution).to.exist;
});

Then('ストーリーボードが作成される', () => {
	expect(response.createStoryboard).to.exist;
	expect(response.createStoryboard.id).to.exist;
});

Then('ストーリーボードIDが返される', () => {
	expect(response.createStoryboard.id).to.exist;
	storyboardId = response.createStoryboard.id;
});

Then('シーンのリストが返される', () => {
	expect(response.scenes).to.exist;
	expect(response.scenes).to.be.an('array');
});

Then('シーンはsceneNumberでソートされる', () => {
	if (response.scenes.length > 1) {
		for (let i = 1; i < response.scenes.length; i++) {
			expect(response.scenes[i].sceneNumber).to.be.at.least(
				response.scenes[i - 1].sceneNumber
			);
		}
	}
});

Then('各シーンにid、sceneNumber、textDescriptionが含まれる', () => {
	expect(response.scenes.length).to.be.greaterThan(0);
	const scene = response.scenes[0];
	expect(scene.id).to.exist;
	expect(scene.sceneNumber).to.exist;
	expect(scene.textDescription).to.exist;
});

Then('シーン詳細が返される', () => {
	expect(response.scene).to.exist;
	expect(response.scene.id).to.exist;
});

Then('シーンにstartTimeSeconds、durationSecondsが含まれる', () => {
	expect(response.scene.startTimeSeconds).to.exist;
	expect(response.scene.durationSeconds).to.exist;
});

Then('動画生成ジョブが作成される', () => {
	expect(response.generateVideo).to.exist;
	expect(response.generateVideo.id).to.exist;
});

Then('ステータスが{string}である', (status: string) => {
	expect(response.generateVideo.status).to.equal(status);
});
// Also support "かつ" (And) keyword - Cucumber treats "かつ" as the same type as the previous step (Then)
Then('かつステータスが{string}である', (status: string) => {
	expect(response.generateVideo.status).to.equal(status);
});
// Also support regex pattern for debugging
Then(/^ステータスが「(.+)」である$/, (status: string) => {
	expect(response.generateVideo.status).to.equal(status);
});
Then(/^かつステータスが「(.+)」である$/, (status: string) => {
	expect(response.generateVideo.status).to.equal(status);
});

Then('variationNumberが設定される', () => {
	expect(response.generateVideo.variationNumber).to.exist;
	expect(response.generateVideo.variationNumber).to.be.a('number');
});

Then('動画のリストが返される', () => {
	expect(response.generatedVideos).to.exist;
	expect(response.generatedVideos).to.be.an('array');
});

Then('各動画にid、status、variationNumberが含まれる', () => {
	expect(response.generatedVideos.length).to.be.greaterThan(0);
	const video = response.generatedVideos[0];
	expect(video.id).to.exist;
	expect(video.status).to.exist;
	expect(video.variationNumber).to.exist;
});

// Additional Given steps for setting values
// These steps are used in Given contexts (with "かつ" keyword)
// Cucumber treats "かつ" as the same type as the previous step (Given)
const setTitle = (title: string) => {
	projectTitle = title;
	storyboardTitle = title;
};
Given('タイトルが「{string}」である', setTitle);
// Also support without quotes for debugging
Given(/^タイトルが「(.+)」である$/, (title: string) => {
	projectTitle = title;
	storyboardTitle = title;
});

const setDescription = (description: string) => {
	projectDescription = description;
};
Given('説明が「{string}」である', setDescription);
// Also support without quotes for debugging
Given(/^説明が「(.+)」である$/, (description: string) => {
	projectDescription = description;
});

const setAspectRatio = (width: number, height: number) => {
	storyboardAspectRatio = `${width}:${height}`;
};
Given('アスペクト比が「{int}:{int}」である', setAspectRatio);

const setResolution = (resolution: string) => {
	storyboardResolution = resolution;
};
Given('解像度が「{string}」である', setResolution);
// Also support without quotes for debugging
Given(/^解像度が「(.+)」である$/, (resolution: string) => {
	storyboardResolution = resolution;
});

