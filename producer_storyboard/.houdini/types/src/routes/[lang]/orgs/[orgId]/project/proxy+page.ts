// @ts-nocheck
/**
 * SSR Load function for project list page
 * KISS原則：サーバー側で認証を確認し、認証済みの場合のみプロジェクトを取得
 */
import { load_ListProjects } from '$houdini';
import type { PageLoad } from './$types';

export const load = async (event: Parameters<PageLoad>[0]) => {
	// サーバー側で認証を確認（layout.server.tsで既に認証チェック済み）
	// 認証済みの場合のみプロジェクトを取得
	// orgIdはX-Org-IdヘッダーでGraphQLクライアントに渡される
	return await load_ListProjects({
		event,
	});
};
