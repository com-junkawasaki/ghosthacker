import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 1421,
		strictPort: true,
		host: true,
		allowedHosts: true
	},
	ssr: {
		noExternal: [
			'@bufbuild/protobuf',
			'@connectrpc/connect',
			'@connectrpc/connect-web'
		]
	},
	envPrefix: ['VITE_'],
	build: {
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: true
	}
});
