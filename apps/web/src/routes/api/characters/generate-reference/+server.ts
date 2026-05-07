import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateSdxl } from '$lib/server/comfyui';
import { projectRoot } from '$lib/server/state';

const QUALITY_PREFIX = 'masterpiece, best quality, very aesthetic, anime illustration, character reference sheet, ';
const REFERENCE_NEGATIVE = [
	'low quality', 'worst quality', 'normal quality', 'lowres', 'blurry',
	'deformed', 'extra fingers', 'bad anatomy', 'malformed hands', 'bad proportions',
	'photograph', 'photorealistic', '3d render', 'monochrome', 'grayscale',
	'multiple panels', 'collage', 'comic page',
	'wings', 'nsfw', 'logo', 'watermark', 'signature', 'text overlay'
].join(', ');

function buildPromptFromProfile(profile: any, name: string): string {
	const ap = profile['gh:appearance'] ?? {};
	const age = profile['schema:age'] ? `${profile['schema:age']} year old, ` : '';
	const gender = inferGender(ap, profile);
	// Strip photoreal hints from the profile's own prompt and keep physical features
	const sanitize = (s: string) => (s ?? '')
		.replace(/photorealistic|raw photo|8k|high-end|cinematic lighting|highly detailed skin texture|webtoon aesthetic/gi, '')
		.replace(/\s+/g, ' ').trim();
	const parts = [
		`1${gender}`,
		age + sanitize(ap['gh:face']),
		sanitize(ap['gh:hair']),
		sanitize(ap['gh:eyes']),
		sanitize(ap['gh:build']),
		'neutral expression, T-pose or relaxed standing pose, full body shot, plain white background, clean line art'
	].filter((p) => p && p.length > 2);
	return QUALITY_PREFIX + parts.join(', ');
}

function inferGender(ap: any, profile: any): 'boy' | 'girl' {
	const blob = JSON.stringify(ap).toLowerCase() + ' ' + (profile['schema:role'] ?? '').toLowerCase() + ' ' + (profile['schema:name'] ?? '').toLowerCase();
	if (/\b(female|girl|woman|she|her|学生.*女|woman)\b/.test(blob)) return 'girl';
	if (/\b(male|boy|man|he|his|男子|gakuran)\b/.test(blob)) return 'boy';
	return 'boy';
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { character, force, overridePrompt, seed } = body as { character?: string; force?: boolean; overridePrompt?: string; seed?: number };
	if (!character) throw error(400, 'character required');

	const charDir = join(projectRoot(), 'resources', 'characters', character);
	const profilePath = join(charDir, 'profile.jsonld');
	if (!existsSync(profilePath)) throw error(404, `Character profile not found: ${character}`);
	const profile = JSON.parse(await readFile(profilePath, 'utf-8'));

	const refPath = join(charDir, 'reference.png');
	if (existsSync(refPath) && !force) {
		return json({ success: true, skipped: true, reason: 'reference exists', path: refPath });
	}

	const positive = overridePrompt ?? buildPromptFromProfile(profile, character);

	const result = await generateSdxl({
		positive,
		negative: REFERENCE_NEGATIVE,
		width: 768,
		height: 1024,
		seed
	});
	await mkdir(charDir, { recursive: true });
	await writeFile(refPath, result.bytes);

	// Save the prompt for reproducibility
	await writeFile(join(charDir, 'reference.prompt.txt'), positive + '\n\n--- negative ---\n' + REFERENCE_NEGATIVE);

	return json({
		success: true,
		character,
		prompt: positive,
		seed: result.seed,
		durationMs: result.durationMs,
		path: refPath
	});
};

export const GET: RequestHandler = async () => {
	const charsDir = join(projectRoot(), 'resources', 'characters');
	const { readdir } = await import('node:fs/promises');
	const entries = await readdir(charsDir, { withFileTypes: true });
	const list = entries
		.filter((e) => e.isDirectory())
		.map((e) => {
			const name = e.name;
			const dir = join(charsDir, name);
			return {
				name,
				hasProfile: existsSync(join(dir, 'profile.jsonld')),
				hasAvatar: existsSync(join(dir, 'avatar.png')),
				hasReference: existsSync(join(dir, 'reference.png'))
			};
		});
	return json({ characters: list });
};
