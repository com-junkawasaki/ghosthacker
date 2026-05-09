import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const [, , episodePathArg] = process.argv;
const episodePath = episodePathArg || '../../260123-jump/resources/episodes/arc0-1-origin/episode.jsonld';
const projectResources = process.env.PROJECT_RESOURCES || '../../260123-jump/resources';
const outputPath = process.env.AUDIT_OUTPUT || '/tmp/arc0-1-panel-image-alignment-audit.json';
const model = process.env.OPENAI_AUDIT_MODEL || 'gpt-4o-mini';
const key = process.env.OPENAI_API_KEY || '';
if (!key) throw new Error('OPENAI_API_KEY not set');

function currentImage(panel) {
	const images = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
	const currentIndex = panel['gh:currentImageIndex'];
	return Number.isInteger(currentIndex) ? images[currentIndex] : images.at(-1);
}

function panelText(panel) {
	const dialogue = Array.isArray(panel.dialogue)
		? panel.dialogue.map((d) => `${d.character || ''}: ${d.text || ''}`).join('\n')
		: '';
	return [
		`visual: ${panel.visual || panel['gh:visual'] || ''}`,
		`narration: ${panel.narration || panel['gh:narration'] || ''}`,
		`shot: ${panel.shot || ''}`,
		dialogue ? `dialogue:\n${dialogue}` : ''
	].filter(Boolean).join('\n');
}

function resizePngForAudit(input, maxSide = Number(process.env.AUDIT_MAX_SIDE || 512)) {
	const src = PNG.sync.read(input);
	const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
	const width = Math.max(1, Math.round(src.width * scale));
	const height = Math.max(1, Math.round(src.height * scale));
	if (width === src.width && height === src.height) return input;
	const out = new PNG({ width, height, colorType: 6 });
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const sx = Math.min(src.width - 1, Math.floor(x / scale));
			const sy = Math.min(src.height - 1, Math.floor(y / scale));
			const si = (sy * src.width + sx) << 2;
			const di = (y * width + x) << 2;
			out.data[di] = src.data[si];
			out.data[di + 1] = src.data[si + 1];
			out.data[di + 2] = src.data[si + 2];
			out.data[di + 3] = src.data[si + 3];
		}
	}
	return PNG.sync.write(out);
}

async function judge(job) {
	const imageBytes = resizePngForAudit(await readFile(job.absImagePath));
	const imageUrl = `data:image/png;base64,${imageBytes.toString('base64')}`;
	const prompt = [
		'You are auditing a manga storyboard panel.',
		'Compare the provided image against the expected panel description.',
		'Only judge visual/scene alignment, not drawing quality.',
		'Mark "mismatch" if the image shows a different main subject, wrong scene, wrong composition, or a character portrait where the expected panel is a room/object/wide shot.',
		'Mark "minor" for partially correct but missing important props/background/action.',
		'Return strict JSON only: {"rating":"match|minor|mismatch","confidence":0.0-1.0,"expected":"...","seen":"...","issue":"..."}',
		'Expected panel:',
		job.expected
	].join('\n');
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
		body: JSON.stringify({
			model,
			response_format: { type: 'json_object' },
			messages: [{
				role: 'user',
				content: [
					{ type: 'text', text: prompt },
					{ type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }
				]
			}]
		})
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`OpenAI audit HTTP ${res.status}: ${text.slice(0, 500)}`);
	const json = JSON.parse(text);
	return JSON.parse(json.choices?.[0]?.message?.content || '{}');
}

async function main() {
	const episode = JSON.parse(await readFile(episodePath, 'utf8'));
	const onlyIds = new Set(String(process.env.AUDIT_PANEL_IDS || '').split(',').map((s) => s.trim().replace(/^panel:/, '')).filter(Boolean));
	const limit = Number(process.env.AUDIT_LIMIT || 0);
	const jobs = [];
	for (const page of episode['gh:pages'] || []) {
		for (const [arrayIndex, panel] of (page['gh:panels'] || []).entries()) {
			const panelId = String(panel['@id'] || panel.id || '').replace(/^panel:/, '');
			if (onlyIds.size && !onlyIds.has(panelId)) continue;
			const img = currentImage(panel);
			const url = img?.['gh:imageUrl'] || panel['gh:generatedImageUrl'];
			if (!url) continue;
			const rel = String(url).replace(/^\//, '');
			const absImagePath = join(projectResources, rel);
			if (!existsSync(absImagePath)) continue;
			jobs.push({
				page: page['gh:pageNumber'],
				panel: panel.panel ?? panel['gh:panelIndex'],
				arrayIndex,
				id: panel['@id'] || panel.id,
				url,
				expected: panelText(panel),
				pipeline: img?.['gh:generationPipeline'] || '',
				refs: img?.['gh:referenceSelections'] || [],
				absImagePath
			});
		}
	}
	if (limit > 0) jobs.length = Math.min(jobs.length, limit);
	console.log(`audit_jobs=${jobs.length}`);
	const results = [];
	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		let audit;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				audit = await judge(job);
				break;
			} catch (error) {
				if (attempt === 3) throw error;
				await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
			}
		}
		const result = { ...job, absImagePath: undefined, audit };
		results.push(result);
		console.log(`${i + 1}/${jobs.length} page=${job.page} panel=${job.panel} ${job.id} rating=${audit.rating} confidence=${audit.confidence} issue=${audit.issue || ''}`);
		await writeFile(outputPath, JSON.stringify({ model, results }, null, 2));
	}
	console.log(`wrote=${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
