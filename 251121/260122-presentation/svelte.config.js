import adapter from './node_modules/@sveltejs/adapter-node/index.js';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		paths: {
			base: ''
		}
	}
};

export default config;
