import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.env.PROJECT_ROOT || '../../260123-jump';
const key = process.env.OPENAI_API_KEY || '';
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const quality = process.env.OPENAI_IMAGE_QUALITY || 'low';

if (!key) throw new Error('OPENAI_API_KEY not set');

const variants = [
	{ slug: 'neutral_front', angle: 'front-facing', expression: 'neutral, calm, relaxed mouth' },
	{ slug: 'three_quarter_left_neutral', angle: 'three-quarter view facing left', expression: 'neutral, observant' },
	{ slug: 'three_quarter_right_neutral', angle: 'three-quarter view facing right', expression: 'neutral, observant' },
	{ slug: 'profile_left', angle: 'left-facing side profile', expression: 'quiet, focused' },
	{ slug: 'profile_right', angle: 'right-facing side profile', expression: 'quiet, focused' },
	{ slug: 'downcast_sad', angle: 'head tilted downward', expression: 'sad, guilty, eyes lowered' },
	{ slug: 'anxious_front', angle: 'front-facing with slight head tilt', expression: 'anxious, tense, worried eyes' },
	{ slug: 'surprised_front', angle: 'front-facing', expression: 'surprised, widened eyes, small parted mouth' },
	{ slug: 'angry_3q_left', angle: 'three-quarter view facing left', expression: 'angry, brows tense, sharp eyes' },
	{ slug: 'focused_3q_right', angle: 'three-quarter view facing right', expression: 'focused, analytical, intense eyes' },
	{ slug: 'gentle_smile_3q', angle: 'three-quarter view', expression: 'gentle small smile, softened eyes' },
	{ slug: 'action_shout', angle: 'dynamic tilted angle', expression: 'shouting or calling out, intense battle or panic energy' }
];

const charsArg = process.argv.slice(2).join(',');

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function charactersFromEpisode() {
	const episodePath = join(projectRoot, 'resources/episodes/arc0-1-origin/episode.jsonld');
	const episode = JSON.parse(await readFile(episodePath, 'utf8'));
	return [...new Set((episode['gh:pages'] || [])
		.flatMap((page) => (page['gh:panels'] || [])
			.flatMap((panel) => (panel.characters || panel['gh:characters'] || [])
				.map((name) => String(name).replace(/^character:/, '')))))].sort();
}

async function generateVariant(character, variant) {
	const charDir = join(projectRoot, 'resources/characters', character);
	const facePath = join(charDir, 'reference_face.png');
	const outDir = join(charDir, 'reference_variants');
	const outPath = join(outDir, `${variant.slug}.png`);
	if (!(await exists(facePath))) {
		console.log(`skip ${character}: missing reference_face.png`);
		return false;
	}
	if (await exists(outPath)) {
		console.log(`skip ${character}/${variant.slug}`);
		return true;
	}

	const face = await readFile(facePath);
	await mkdir(outDir, { recursive: true });
	const form = new FormData();
	form.append('model', model);
	form.append('prompt', [
		'Create a black-and-white manga face reference variant of the same character identity as the supplied image.',
		'Preserve identity only: face shape, eye design, hairstyle silhouette, age impression, and manga line/screentone style.',
		`Angle: ${variant.angle}.`,
		`Expression: ${variant.expression}.`,
		'Head, face, hair, and upper neck only. Plain clean background.',
		'Do not preserve outfit, body pose, scene background, props, labels, text, or speech bubbles.',
		'Do not copy the original face angle unless the requested angle is front-facing.'
	].join(' '));
	form.append('size', '1024x1024');
	form.append('n', '1');
	form.append('quality', quality);
	form.append('image', new Blob([new Uint8Array(face)], { type: 'image/png' }), `${character}-face.png`);

	const res = await fetch('https://api.openai.com/v1/images/edits', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}` },
		body: form
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${character}/${variant.slug}: ${res.status} ${text.slice(0, 500)}`);
	const b64 = JSON.parse(text).data?.[0]?.b64_json;
	if (!b64) throw new Error(`${character}/${variant.slug}: no image returned`);
	await writeFile(outPath, Buffer.from(b64, 'base64'));
	console.log(`ok ${character}/${variant.slug}`);
	return true;
}

async function main() {
	const characters = charsArg
		? charsArg.split(',').map((name) => name.trim()).filter(Boolean)
		: await charactersFromEpisode();

	console.log(`characters=${characters.length}`);
	console.log(`variants=${variants.length}`);
	console.log(`model=${model}`);
	console.log(`quality=${quality}`);

	for (const character of characters) {
		const charDir = join(projectRoot, 'resources/characters', character);
		if (!existsSync(charDir)) {
			console.log(`skip ${character}: missing character dir`);
			continue;
		}
		await mkdir(join(charDir, 'reference_variants'), { recursive: true });
		await writeFile(
			join(charDir, 'reference_variants/variants.json'),
			JSON.stringify(variants, null, 2) + '\n'
		);
		for (const variant of variants) {
			await generateVariant(character, variant);
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
