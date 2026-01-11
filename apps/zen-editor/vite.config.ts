import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// #region agent log
fetch('http://127.0.0.1:7249/ingest/e16c245d-b5ae-4213-a2e9-a99d3b60cda9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vite.config.ts:4',message:'vite.config.ts loaded',data:{deno:typeof Deno!=='undefined',node:typeof process!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		pool: 'forks',
		poolOptions: {
			forks: {
				execArgv: [] // Deno 環境では Node.js の execArgv を空にする
			}
		}
	},
	// Tauri expects a fixed port when developing
	server: {
		port: 1420,
		strictPort: true,
		host: true,
    allowedHosts: true
	},
	ssr: {
		noExternal: ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-shell']
	},
	// to make use of `TAURI_DEBUG` and other env variables
	// https://tauri.app/v1/api/config#buildconfig.beforedevcommand
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		// Tauri supports es2021
		target: 'esnext',
		// don't minify for debug builds
		minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_DEBUG
	}
});

