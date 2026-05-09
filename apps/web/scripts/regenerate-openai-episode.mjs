import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const [, , episodePathArg] = process.argv;
const episodePath = episodePathArg || '../../260123-jump/resources/episodes/arc0-1-origin/episode.jsonld';
const endpoint = process.env.STORYBOARD_WEB_URL || 'http://127.0.0.1:1421';
const progressPath = process.env.PROGRESS_PATH || `/tmp/${basename(episodePath)}.gpt-image-2-progress.json`;
const dummyImage =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadProgress() {
	try {
		return JSON.parse(await readFile(progressPath, 'utf8'));
	} catch {
		return { completed: [], failed: [] };
	}
}

async function saveProgress(progress) {
	await writeFile(progressPath, JSON.stringify(progress, null, 2));
}

async function postGeneration(job) {
	const maxAttempts = Number(process.env.REGEN_MAX_ATTEMPTS || 3);
	let last = null;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const started = Date.now();
		const res = await fetch(`${endpoint}/api/panels/sdxl-sketch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				episodeId: job.episodeId,
				pageNumber: job.pageNumber,
				panelIndex: job.panelIndex,
				panelArrayIndex: job.panelArrayIndex,
				image: dummyImage,
				engine: 'openai',
				persist: true,
				imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'low',
				extraPositive: 'Fresh full-episode regeneration using gpt-image-2.'
			})
		});
		const elapsed = Date.now() - started;
		const text = await res.text();
		last = { res, text, elapsed, attempt };
		if (res.ok) return last;
		if (![429, 500, 502, 503, 504].includes(res.status) || attempt === maxAttempts) return last;
		const waitMs = Number(process.env.REGEN_RETRY_DELAY_MS || 5000) * attempt;
		console.warn(`${new Date().toISOString()} retry status=${res.status} attempt=${attempt}/${maxAttempts} wait_ms=${waitMs}`);
		await sleep(waitMs);
	}
	return last;
}

async function main() {
	const episode = JSON.parse(await readFile(episodePath, 'utf8'));
	const episodeId = episode['gh:episodeId'] || episode.episodeId;
	if (!episodeId) throw new Error(`No episode id in ${episodePath}`);

	const jobs = [];
	for (const page of episode['gh:pages'] || []) {
		const pageNumber = page['gh:pageNumber'];
		for (const [panelArrayIndex, panel] of (page['gh:panels'] || []).entries()) {
			const panelIndex = panel['gh:panelIndex'] ?? panel.panel;
			if (pageNumber == null || panelIndex == null) continue;
			jobs.push({
				key: `${pageNumber}:${panelArrayIndex}:${panelIndex}`,
				legacyKey: `${pageNumber}:${panelIndex}`,
				episodeId,
				pageNumber,
				panelIndex,
				panelArrayIndex,
				panelId: panel['@id'] || panel.id || ''
			});
		}
	}

	const progress = await loadProgress();
	const rawCompleted = progress.completed || [];
	const completed = new Set(rawCompleted.filter((key) => String(key).split(':').length >= 3));
	const legacyCompleted = new Set(rawCompleted.filter((key) => String(key).split(':').length === 2));
	const seenLegacy = new Set();
	for (const job of jobs) {
		if (legacyCompleted.has(job.legacyKey) && !seenLegacy.has(job.legacyKey)) {
			completed.add(job.key);
			seenLegacy.add(job.legacyKey);
		}
	}
	const failed = progress.failed || [];

	console.log(`episode=${episodeId}`);
	console.log(`jobs=${jobs.length}`);
	console.log(`already_completed=${completed.size}`);
	console.log(`progress=${progressPath}`);

	let doneThisRun = 0;
	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		if (completed.has(job.key)) continue;

		const label = `[${i + 1}/${jobs.length}] page=${job.pageNumber} panel=${job.panelIndex} ${job.panelId}`;
		console.log(`${new Date().toISOString()} start ${label}`);

		const { res, text, elapsed, attempt } = await postGeneration(job);
		if (!res.ok) {
			const failure = {
				...job,
				status: res.status,
				body: text.slice(0, 1000),
				attempt,
				at: new Date().toISOString()
			};
			failed.push(failure);
			progress.failed = failed;
			await saveProgress(progress);
			console.error(`${new Date().toISOString()} fail ${label} status=${res.status} attempt=${attempt} elapsed_ms=${elapsed}`);
			console.error(text.slice(0, 1000));
			process.exitCode = 1;
			return;
		}

		let body;
		try {
			body = JSON.parse(text);
		} catch {
			body = { raw: text.slice(0, 200) };
		}

		completed.add(job.key);
		progress.completed = [...completed];
		progress.last = {
			...job,
			imageUrl: body.imageUrl,
			durationMs: body.durationMs,
			at: new Date().toISOString()
		};
		await saveProgress(progress);
		doneThisRun += 1;
		console.log(
			`${new Date().toISOString()} ok ${label} elapsed_ms=${elapsed} duration_ms=${body.durationMs ?? ''} image=${body.imageUrl ?? ''}`
		);

		await sleep(Number(process.env.REGEN_DELAY_MS || 1000));
	}

	console.log(`completed_total=${completed.size}/${jobs.length}`);
	console.log(`completed_this_run=${doneThisRun}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
