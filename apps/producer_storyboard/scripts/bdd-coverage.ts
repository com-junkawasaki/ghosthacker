#!/usr/bin/env tsx
/**
 * BDD E2E Coverage Report Generator
 * Generates coverage report for BDD E2E tests based on capabilities.jsonld
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Capability {
	id: string;
	name: string;
	description: string;
	hasActivity: Array<{ '@id': string }>;
}

interface CapabilitiesJson {
	'@graph': Capability[];
}

interface FeatureFile {
	path: string;
	name: string;
	scenarios: number;
	capabilities: string[];
}

function loadCapabilities(): Capability[] {
	const capabilitiesPath = join(process.cwd(), 'capabilities.jsonld');
	const content = readFileSync(capabilitiesPath, 'utf-8');
	const json: CapabilitiesJson = JSON.parse(content);
	return json['@graph'];
}

function findFeatureFiles(): FeatureFile[] {
	const featuresDir = join(process.cwd(), 'tests/bdd/e2e/features');
	const files = readdirSync(featuresDir, { recursive: true, withFileTypes: true });
	
	const featureFiles: FeatureFile[] = [];
	
	for (const file of files) {
		if (file.isFile() && file.name.endsWith('.feature')) {
			const filePath = join(file.path, file.name);
			const content = readFileSync(filePath, 'utf-8');
			
			// Extract capability names from comments
			const capabilityMatches = content.match(/capabilities\.jsonldの「(.+?)」capability/g);
			const capabilities = capabilityMatches
				? capabilityMatches.map(m => m.match(/「(.+?)」/)?.[1] || '').filter(Boolean)
				: [];
			
			// Count scenarios
			const scenarioMatches = content.match(/シナリオ:/g);
			const scenarios = scenarioMatches ? scenarioMatches.length : 0;
			
			featureFiles.push({
				path: filePath,
				name: file.name,
				scenarios,
				capabilities,
			});
		}
	}
	
	return featureFiles;
}

function generateCoverageReport() {
	const capabilities = loadCapabilities();
	const featureFiles = findFeatureFiles();
	
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('BDD E2E Coverage Report');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
	
	// Map capabilities to feature files
	const capabilityCoverage = new Map<string, {
		capability: Capability;
		featureFiles: FeatureFile[];
		totalScenarios: number;
	}>();
	
	for (const capability of capabilities) {
		const relatedFeatures = featureFiles.filter(f => 
			f.capabilities.includes(capability.name)
		);
		const totalScenarios = relatedFeatures.reduce((sum, f) => sum + f.scenarios, 0);
		
		capabilityCoverage.set(capability.name, {
			capability,
			featureFiles: relatedFeatures,
			totalScenarios,
		});
	}
	
	// Print coverage by capability
	console.log('📊 Coverage by Capability:\n');
	
	let totalCovered = 0;
	let totalCapabilities = capabilities.length;
	
	for (const [capabilityName, coverage] of capabilityCoverage.entries()) {
		const { capability, featureFiles, totalScenarios } = coverage;
		const isCovered = featureFiles.length > 0;
		
		if (isCovered) {
			totalCovered++;
		}
		
		const status = isCovered ? '✅' : '❌';
		console.log(`${status} ${capabilityName}`);
		console.log(`   Description: ${capability.description}`);
		console.log(`   Activities: ${capability.hasActivity.length}`);
		console.log(`   Feature Files: ${featureFiles.length}`);
		console.log(`   Scenarios: ${totalScenarios}`);
		
		if (featureFiles.length > 0) {
			console.log(`   Files:`);
			for (const file of featureFiles) {
				console.log(`     - ${file.name} (${file.scenarios} scenarios)`);
			}
		} else {
			console.log(`   ⚠️  No E2E tests found`);
		}
		console.log('');
	}
	
	// Print summary
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('Summary:');
	console.log(`  Total Capabilities: ${totalCapabilities}`);
	console.log(`  Covered Capabilities: ${totalCovered}`);
	console.log(`  Coverage: ${((totalCovered / totalCapabilities) * 100).toFixed(1)}%`);
	console.log(`  Total Feature Files: ${featureFiles.length}`);
	console.log(`  Total Scenarios: ${featureFiles.reduce((sum, f) => sum + f.scenarios, 0)}`);
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
	
	// Check for missing coverage
	const uncovered = Array.from(capabilityCoverage.entries())
		.filter(([_, coverage]) => coverage.featureFiles.length === 0)
		.map(([name]) => name);
	
	if (uncovered.length > 0) {
		console.log('⚠️  Missing Coverage:');
		for (const name of uncovered) {
			console.log(`   - ${name}`);
		}
		console.log('');
	}
	
	// Exit with error code if coverage is not 100%
	if (totalCovered < totalCapabilities) {
		console.error(`❌ Coverage is ${((totalCovered / totalCapabilities) * 100).toFixed(1)}%, target is 100%`);
		process.exit(1);
	} else {
		console.log('✅ Coverage is 100%!');
		process.exit(0);
	}
}

generateCoverageReport();

