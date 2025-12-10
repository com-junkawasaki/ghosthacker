/**
 * Cucumber configuration for BDD E2E tests
 * Uses Playwright for browser automation
 */
module.exports = {
	default: {
		requireModule: ['tsx/cjs'],
		require: [
			'tests/bdd/e2e/step_definitions/**/*.ts',
		],
		format: [
			'progress-bar',
			'json:tests/bdd/reports/cucumber-e2e-report.json',
			'html:tests/bdd/reports/cucumber-e2e-report.html',
		],
		formatOptions: {
			snippetInterface: 'async-await',
		},
		worldParameters: {
			baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
			headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
		},
	},
};
