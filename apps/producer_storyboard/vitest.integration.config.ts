import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/tdd/integration/**/*.test.ts'],
		environment: 'node',
		globals: true,
		testTimeout: 10000,
	},
});

