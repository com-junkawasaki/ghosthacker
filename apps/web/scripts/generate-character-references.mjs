#!/usr/bin/env node
// Generate AnimagineXL anime-style reference portraits for the top characters.
// Hits the local /api/characters/generate-reference endpoint.
//
// Usage:
//   node apps/web/scripts/generate-character-references.mjs [--force] [--top N] [--only Yuto,Nei]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/junkawasaki/github/ghosthacker/260123-jump/resources';
const ENDPOINT = 'http://localhost:1421/api/characters/generate-reference';

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const TOP = (() => {
	const i = process.argv.indexOf('--top');
	return i >= 0 ? Number(process.argv[i + 1]) : 15;
})();
const ONLY = (() => {
	const i = process.argv.indexOf('--only');
	return i >= 0 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim())) : null;
})();

function topCharacters(limit) {
	const counts = {};
	const epRoot = join(ROOT, 'episodes');
	for (const ep of readdirSync(epRoot)) {
		const f = join(epRoot, ep, 'episode.jsonld');
		if (!existsSync(f)) continue;
		const d = JSON.parse(readFileSync(f, 'utf8'));
		for (const pg of d['gh:pages'] ?? []) for (const pn of pg['gh:panels'] ?? []) {
			for (const c of pn['characters'] ?? pn['gh:characters'] ?? []) {
				const name = String(c).replace(/^character:/, '');
				counts[name] = (counts[name] ?? 0) + 1;
			}
		}
	}
	return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n);
}

async function generate(character) {
	const t0 = Date.now();
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ character, force: FORCE })
	});
	const json = await res.json();
	const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
	if (!json.success) {
		console.log(`  ✗ ${character} (${elapsed}s): ${json.message ?? JSON.stringify(json).slice(0, 200)}`);
		return false;
	}
	if (json.skipped) {
		console.log(`  - ${character} (skipped, exists)`);
	} else {
		console.log(`  ✓ ${character} (${elapsed}s, seed=${json.seed})`);
	}
	return true;
}

async function main() {
	let names = topCharacters(TOP);
	if (ONLY) names = names.filter((n) => ONLY.has(n));
	const charsDir = join(ROOT, 'characters');
	names = names.filter((n) => existsSync(join(charsDir, n, 'profile.jsonld')));
	console.log(`Generating references for ${names.length} characters (force=${FORCE})`);
	console.log('Order:', names.join(', '));
	let ok = 0, fail = 0;
	for (const n of names) {
		const success = await generate(n);
		if (success) ok++; else fail++;
	}
	console.log(`Done. ok=${ok} fail=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
