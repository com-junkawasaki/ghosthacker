import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import houdini from 'houdini/vite';

export default defineConfig({
	plugins: [houdini(), sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		allowedHosts: [
			'frontend.producer-storyboard.orb.local',
			'localhost',
			'.local',
		],
		watch: {
			usePolling: true,
			interval: 1000,
		},
	},
});
