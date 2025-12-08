#!/usr/bin/env node

/**
 * Generate TypeScript types from gRPC proto files using Connect-ES
 * This script generates client code for the storyboard editor gRPC service
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const protoDir = join(__dirname, '../performers/services/grpc/proto');
const outputDir = join(__dirname, '../src/lib/grpc/generated');

console.log('Generating gRPC TypeScript types...');
console.log(`Proto directory: ${protoDir}`);
console.log(`Output directory: ${outputDir}`);

try {
	// Use buf to generate Connect-ES code
	// Note: This requires buf CLI to be installed
	execSync(
		`buf generate --template buf.gen.connect-es.yaml ${protoDir}`,
		{
			cwd: __dirname,
			stdio: 'inherit',
		}
	);
	
	console.log('gRPC types generated successfully!');
} catch (error) {
	console.error('Failed to generate gRPC types:', error);
	process.exit(1);
}
