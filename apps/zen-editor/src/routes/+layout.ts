export const ssr = false;
export const prerender = true; // Tauri では静的サイトとしてビルドするため true が推奨

if (typeof window !== 'undefined') {
    console.log("SPA Mode: SSR disabled, Layout loaded on client.");
}

