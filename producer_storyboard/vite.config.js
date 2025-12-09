import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import houdini from 'houdini/vite';

export default defineConfig({
	plugins: [houdini(), sveltekit()],
	server: {
		proxy: {
			'/api/graphql': {
				target: process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/graphql/, '')
			}
		},
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	}
});
