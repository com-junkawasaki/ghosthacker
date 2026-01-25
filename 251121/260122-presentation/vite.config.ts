import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		dedupe: ['svelte', 'three']
	},
	server: {
		port: 1421,
		strictPort: true,
	}
});
