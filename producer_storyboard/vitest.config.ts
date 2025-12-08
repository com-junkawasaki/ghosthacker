import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib'),
		},
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/tdd/unit/**/*.test.ts', 'tests/tdd/integration/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'tests/',
				'**/*.config.{js,ts}',
				'**/*.d.ts',
				'src/app.d.ts',
				'**/*.svelte', // Exclude Svelte files from coverage
				'$houdini/**',
				'.svelte-kit/**',
				'src/lib/graphql/client.ts', // Exclude due to SvelteKit-specific imports
				'src/routes/**/*.server.ts', // Exclude SvelteKit server files
				'src/routes/**/*.svelte', // Exclude Svelte route files
			],
			include: [
				'src/lib/**/*.ts',
			],
			// Temporarily lower thresholds to achieve coverage incrementally
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 70,
				statements: 80,
			},
		},
		setupFiles: ['./tests/setup.ts'],
	},
});
