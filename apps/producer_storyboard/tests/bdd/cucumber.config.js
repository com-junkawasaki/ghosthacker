/**
 * Cucumber configuration for BDD tests
 * Based on capabilities.jsonld
 */
module.exports = {
	default: {
		requireModule: ['tsx/cjs'],
		require: [
			'tests/bdd/step_definitions/**/*.ts',
		],
		format: [
			'progress-bar',
			'json:tests/bdd/reports/cucumber-report.json',
			'html:tests/bdd/reports/cucumber-report.html',
		],
		formatOptions: {
			snippetInterface: 'async-await',
		},
		worldParameters: {
			graphqlApiUrl: process.env.GRAPHQL_API_URL || 'http://localhost:25325/graphql',
		},
	},
};

