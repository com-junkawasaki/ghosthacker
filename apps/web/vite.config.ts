import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { validateApiClient } from './vite-plugin-validate-api';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		validateApiClient()
	],
	resolve: {
		alias: {
			'skeleton-base': resolve('node_modules/@skeletonlabs/skeleton/src/index.css'),
			'skeleton-theme': resolve('node_modules/@skeletonlabs/skeleton/src/themes/nouveau.css'),
		}
	},
	server: {
		port: 1421,
		strictPort: true,
		host: true,
		allowedHosts: true,
		watch: {
			usePolling: true
		},
		hmr: {
			clientPort: 1421
		}
	},
	ssr: {
		noExternal: [
			'@bufbuild/protobuf',
			'@connectrpc/connect',
			'@connectrpc/connect-web',
			'@skeletonlabs/skeleton-svelte',
			'@zag-js/svelte',
			/^@zag-js\//,
		],
		resolve: {
			conditions: ['svelte', 'import', 'module', 'browser', 'default'],
		}
	},
	envPrefix: ['VITE_'],
	build: {
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: true,
		rollupOptions: {
			onwarn(warning, warn) {
				// Treat API client warnings as errors during build
				if (warning.message.includes('storyboardClient') || warning.message.includes('response.episodes')) {
					throw new Error(`Build error: ${warning.message}`);
				}
				warn(warning);
			}
		}
	}
});
