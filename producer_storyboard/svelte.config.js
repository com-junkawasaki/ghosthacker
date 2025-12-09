import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x',
		}),
		alias: {
			$lib: './src/lib',
			$houdini: path.resolve('.', '$houdini'),
		}
	}
};

export default config;
