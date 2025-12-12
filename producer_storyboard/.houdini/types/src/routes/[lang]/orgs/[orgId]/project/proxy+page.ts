// @ts-nocheck
/**
 * SSR Load function for project list page
 * KISS原則：サーバー側で認証を確認し、認証済みの場合のみプロジェクトを取得
 * blocking: true でSSRデータがクライアントでリセットされないようにする
 */
import { ListProjectsStore } from '$houdini';
import type { PageLoad } from './$types';

export const load = async (event: Parameters<PageLoad>[0]) => {
	// サーバー側で認証を確認（layout.server.tsで既に認証チェック済み）
	// blocking: true でSSRデータがクライアントでリセットされないようにする
	const store = new ListProjectsStore();
	await store.fetch({ event, blocking: true });
	
	return {
		ListProjects: store,
	};
};
