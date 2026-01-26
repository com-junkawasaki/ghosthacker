import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0', // Explicitly set host in config instead of CLI flag
		port: 5173,
		strictPort: false,
		// Include both with and without ports to handle all cases
		allowedHosts: [
			'frontend.producer-storyboard.orb.local',
			'.producer-storyboard.orb.local',
			// Include common ports in case Vite checks host:port format
			'frontend.producer-storyboard.orb.local:5173',
			'frontend.producer-storyboard.orb.local:25322',
			'.producer-storyboard.orb.local:5173',
			'.producer-storyboard.orb.local:25322'
		],
		// HMR (Hot Module Replacement) configuration
		hmr: {
			protocol: 'ws',
			host: 'frontend.producer-storyboard.orb.local',
			port: 25322,
			clientPort: 25322
		},
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		},
		watch: {
			usePolling: true,
			interval: 1000
		}
	}
});
