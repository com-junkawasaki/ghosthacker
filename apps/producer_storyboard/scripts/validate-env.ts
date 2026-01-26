/**
 * Environment variable validation script
 * Runs before build to ensure required environment variables are set
 * 
 * Usage: tsx scripts/validate-env.ts
 */

interface EnvVarConfig {
	name: string;
	description: string;
	required: boolean;
	alternatives?: string[];
}

const REQUIRED_ENV_VARS: EnvVarConfig[] = [
	{
		name: 'PUBLIC_CLERK_PUBLISHABLE_KEY',
		description: 'Clerk publishable key for authentication',
		required: true,
		alternatives: ['CLERK_PUBLISHABLE_KEY'],
	},
	{
		name: 'CLERK_SECRET_KEY',
		description: 'Clerk secret key for server-side authentication',
		required: true,
	},
];

function validateEnvVars(): void {
	console.log('🔍 Validating environment variables...\n');

	const errors: string[] = [];
	const warnings: string[] = [];

	for (const config of REQUIRED_ENV_VARS) {
		const value = process.env[config.name];
		const alternativeValues = config.alternatives?.map((alt) => process.env[alt]);
		const hasValue = value || alternativeValues?.some((v) => v);

		if (config.required && !hasValue) {
			const altNames = config.alternatives?.length
				? ` (or ${config.alternatives.join(', ')})`
				: '';
			errors.push(`❌ Missing required: ${config.name}${altNames}`);
			errors.push(`   Description: ${config.description}`);
		} else if (hasValue) {
			const usedVar = value
				? config.name
				: config.alternatives?.find((alt) => process.env[alt]);
			console.log(`✅ ${usedVar}: Set`);
		} else {
			warnings.push(`⚠️  Optional not set: ${config.name}`);
		}
	}

	console.log('');

	if (warnings.length > 0) {
		console.log('Warnings:');
		warnings.forEach((w) => console.log(w));
		console.log('');
	}

	if (errors.length > 0) {
		console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.error('❌ BUILD FAILED: Missing required environment variables');
		console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.error('');
		errors.forEach((e) => console.error(e));
		console.error('');
		console.error('Please set the required environment variables:');
		console.error('  - For Vercel: vercel env add <VAR_NAME> production');
		console.error('  - For local: Add to .env.local or .envrc');
		console.error('');
		console.error('Get Clerk keys from: https://dashboard.clerk.com/last-active?path=api-keys');
		console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		process.exit(1);
	}

	console.log('✅ All required environment variables are set!\n');
}

validateEnvVars();

