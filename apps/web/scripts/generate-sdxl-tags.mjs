#!/usr/bin/env node
// Generate SDXL booru-style tags for every panel in 260123-jump and write them
// back to each episode JSONLD as `gh:sdxlTags` (string[]) and `gh:sdxlPrompt`.
//
// Usage:
//   OPENROUTER_APIKEY=... node apps/web/scripts/generate-sdxl-tags.mjs [--force] [--limit N] [--episode <id>]
//
// Idempotent: panels that already have `gh:sdxlTags` are skipped unless --force.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/junkawasaki/github/ghosthacker/260123-jump/resources/episodes';
const CONCURRENCY = Number(process.env.SDXL_TAGS_CONCURRENCY || 8);

const PROVIDER = process.env.OPENAI_API_KEY
	? { name: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, defaultModel: 'gpt-4o-mini' }
	: process.env.OPENROUTER_APIKEY
		? { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_APIKEY, defaultModel: 'anthropic/claude-haiku-4.5' }
		: null;
if (!PROVIDER) {
	console.error('Set OPENAI_API_KEY or OPENROUTER_APIKEY (source .envrc).');
	process.exit(1);
}
const MODEL = process.env.SDXL_TAGS_MODEL || PROVIDER.defaultModel;

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const LIMIT = (() => {
	const i = process.argv.indexOf('--limit');
	return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();
const ONLY_EPISODE = (() => {
	const i = process.argv.indexOf('--episode');
	return i >= 0 ? process.argv[i + 1] : null;
})();

const SYSTEM = `You convert a single storyboard panel into SDXL-friendly tags for image generation.

Output strict JSON: {"tags": string[], "negative": string[]}.

"tags" rules:
- 18-28 lowercase tokens, booru/danbooru style. Each token is a flat phrase with words joined by spaces or underscores.
- NO namespacing. NEVER prefix tags with labels like "character:", "shot:", "lighting:", "style:", "attire:". Just the value.
- NO multi-value comma-joined tokens. Each array element is ONE concept.
- Order: subject count -> characters -> attire/identity cues -> action/pose -> facial expression -> environment / location -> time of day -> lighting -> camera (shot type, angle, lens) -> composition / mood -> style.
- Always include shot type and camera angle as their own tags (e.g. "wide shot", "high angle").
- Translate Japanese descriptions into concrete English visual tags. Never include Japanese characters.
- Prefer concrete visuals over abstract feelings ("rain on window" > "melancholy"). One mood word at most.
- Always end with these style tags as the last 4 elements: "anime style", "manga panel", "cinematic", "detailed background".

"negative" rules:
- 8-14 lowercase tokens. Always include: "low quality", "worst quality", "blurry", "deformed", "extra fingers", "bad anatomy", "watermark".
- Include "text" only when the panel does NOT intentionally show text/UI/notifications/screens.

Example valid tag list:
["1boy","teen boy","hoodie","sitting on bed","scared expression","bedroom","night","dim moonlight","close-up","high angle","50mm lens","oppressive mood","anime style","manga panel","cinematic","detailed background"]`;

function buildUserPrompt(panel, episodeMeta) {
	const sp = panel['gh:shotProperties'] || {};
	const dialogueLines = (panel.dialogue || panel['gh:dialogue'] || [])
		.map((d) => `${d.speaker || d['gh:speaker'] || '?'}: ${d.text || d.en || ''}`)
		.filter((s) => s.length > 3)
		.slice(0, 4);

	const lines = [
		`Episode: ${episodeMeta.title || episodeMeta.id}`,
		`Setting: ${episodeMeta.setting || ''}`,
		`Page ${panel._pageNumber} Panel ${panel.panel || panel['gh:panelIndex'] || '?'}`,
		`Visual (JP/EN): ${panel.visual || panel['gh:visual']?.en || panel['gh:visual'] || ''}`,
		`Shot: ${panel.shot || ''}`,
		`Angle: ${sp['gh:angle'] || ''}`,
		`Distance: ${sp['gh:distance'] || ''}`,
		`Lens: ${sp['gh:lens'] || ''}`,
		`Aperture: ${sp['gh:aperture'] || ''}`,
		`Lighting: ${sp['gh:lighting'] || ''}`,
		`Atmosphere: ${sp['gh:atmosphere'] || ''}`,
		`Environment: ${panel.environment || ''}`,
		`Characters: ${(panel.characters || []).join(', ')}`,
		dialogueLines.length ? `Dialogue:\n${dialogueLines.join('\n')}` : ''
	].filter(Boolean);

	return lines.join('\n');
}

async function callModel(panel, episodeMeta) {
	const body = {
		model: MODEL,
		max_tokens: 600,
		response_format: { type: 'json_object' },
		messages: [
			{ role: 'system', content: SYSTEM },
			{ role: 'user', content: buildUserPrompt(panel, episodeMeta) }
		]
	};
	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${PROVIDER.key}`
	};
	if (PROVIDER.name === 'openrouter') {
		headers['HTTP-Referer'] = 'https://ghosthacker.local';
		headers['X-Title'] = 'ghosthacker sdxl tag generator';
	}
	const res = await fetch(PROVIDER.url, { method: 'POST', headers, body: JSON.stringify(body) });
	if (!res.ok) {
		const errText = await res.text();
		throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
	}
	const json = await res.json();
	const content = json.choices?.[0]?.message?.content;
	if (!content) throw new Error(`No content. Raw: ${JSON.stringify(json).slice(0, 300)}`);
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch {
		const m = content.match(/\{[\s\S]*\}/);
		if (!m) throw new Error(`Non-JSON response: ${content.slice(0, 300)}`);
		parsed = JSON.parse(m[0]);
	}
	const tags = (parsed.tags || []).map((t) => String(t).trim()).filter(Boolean);
	const negative = (parsed.negative || []).map((t) => String(t).trim()).filter(Boolean);
	if (!tags.length) throw new Error('Model returned empty tags');
	return { tags, negative, prompt: tags.join(', ') };
}

async function pool(items, worker, concurrency) {
	const results = new Array(items.length);
	let next = 0;
	let done = 0;
	const total = items.length;
	const start = Date.now();
	async function run() {
		while (true) {
			const i = next++;
			if (i >= items.length) return;
			try {
				results[i] = await worker(items[i], i);
			} catch (err) {
				results[i] = { error: err.message };
			}
			done++;
			if (done % 5 === 0 || done === total) {
				const elapsed = ((Date.now() - start) / 1000).toFixed(1);
				process.stdout.write(`\r  progress: ${done}/${total} (${elapsed}s)`);
			}
		}
	}
	await Promise.all(Array.from({ length: concurrency }, run));
	process.stdout.write('\n');
	return results;
}

async function processEpisode(epDir) {
	const file = join(ROOT, epDir, 'episode.jsonld');
	if (!existsSync(file)) return { skipped: true };
	const data = JSON.parse(readFileSync(file, 'utf8'));
	const episodeMeta = {
		id: data['gh:episodeId'] || epDir,
		title: data['dct:title'] || '',
		setting: data['gh:setting'] || ''
	};
	const targets = [];
	for (const page of data['gh:pages'] || []) {
		const pageNumber = page['gh:pageNumber'];
		for (const panel of page['gh:panels'] || []) {
			if (!FORCE && Array.isArray(panel['gh:sdxlTags']) && panel['gh:sdxlTags'].length) continue;
			panel._pageNumber = pageNumber;
			targets.push(panel);
			if (targets.length >= LIMIT) break;
		}
		if (targets.length >= LIMIT) break;
	}
	if (!targets.length) {
		console.log(`  ${episodeMeta.id}: nothing to do`);
		return { panels: 0 };
	}
	console.log(`  ${episodeMeta.id}: ${targets.length} panels`);
	const results = await pool(targets, async (panel) => callModel(panel, episodeMeta), CONCURRENCY);

	let ok = 0, fail = 0;
	results.forEach((r, i) => {
		const panel = targets[i];
		delete panel._pageNumber;
		if (r?.error) {
			fail++;
			panel['gh:sdxlTagsError'] = r.error;
			return;
		}
		ok++;
		panel['gh:sdxlTags'] = r.tags;
		panel['gh:sdxlNegative'] = r.negative;
		panel['gh:sdxlPrompt'] = r.prompt;
		panel['gh:sdxlModel'] = MODEL;
		panel['gh:sdxlGeneratedAt'] = Math.floor(Date.now() / 1000);
		delete panel['gh:sdxlTagsError'];
	});
	writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
	console.log(`  ${episodeMeta.id}: wrote ${ok} ok, ${fail} fail`);
	return { panels: targets.length, ok, fail };
}

async function main() {
	const eps = readdirSync(ROOT).sort();
	const list = ONLY_EPISODE ? eps.filter((e) => e === ONLY_EPISODE) : eps;
	console.log(`Generating SDXL tags with ${MODEL} (concurrency=${CONCURRENCY}, force=${FORCE}, limit=${LIMIT})`);
	console.log(`Episodes: ${list.length}`);
	let totalOk = 0, totalFail = 0;
	for (const ep of list) {
		const r = await processEpisode(ep);
		totalOk += r.ok || 0;
		totalFail += r.fail || 0;
	}
	console.log(`Done. ok=${totalOk} fail=${totalFail}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
