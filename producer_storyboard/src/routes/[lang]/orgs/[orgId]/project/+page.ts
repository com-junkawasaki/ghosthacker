/**
 * SSR Load function for project list page
 * KISS原則：サーバー側で認証を確認し、認証済みの場合のみプロジェクトを取得
 * blocking: true でSSRデータがクライアントでリセットされないようにする
 * metadata.orgId でSSR時にもX-Org-Idヘッダーを送信
 */
import { ListProjectsStore } from '$houdini';
import type { PageLoad } from './$types';
import { browser } from '$app/environment';

export const load: PageLoad = async (event) => {
	const { orgId } = event.params;
	
	console.log(`[DEBUG +page.ts] load called - browser: ${browser}, orgId: ${orgId}`);
	
	// サーバー側で認証を確認（layout.server.tsで既に認証チェック済み）
	// blocking: true でSSRデータがクライアントでリセットされないようにする
	// metadata.orgId でSSR時にもX-Org-Idヘッダーを送信
	const store = new ListProjectsStore();
	
	console.log(`[DEBUG +page.ts] calling store.fetch with metadata: { orgId: ${orgId} }`);
	
	await store.fetch({ 
		event, 
		blocking: true,
		metadata: { orgId },
	});
	
	// @ts-expect-error - accessing internal state for debugging
	const storeData = store.data;
	console.log(`[DEBUG +page.ts] store.fetch completed - projects count: ${storeData?.projects?.length ?? 'undefined'}`);
	
	return {
		ListProjects: store,
	};
};
