import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { mkdir, writeFile, readFile as fsReadFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findEpisode, saveJsonLd } from '$lib/server/jsonld';
import { generateSdxlImg2Img, inpaintWithIPACharacter } from '$lib/server/comfyui';
import { imagesDir, getActiveProject, projectRoot } from '$lib/server/state';
import { verticalStrips, buildMaskPng, cropFaceRegion } from '$lib/server/mask';
import { getCheckpointConfig } from '$lib/server/checkpoint-config';
import { generateOpenAIImage } from '$lib/server/external-image-gen';
import { generateLayeredStoryboardImage } from '$lib/server/image-generation-graph';

// Tags in the stored SDXL prompt that confuse SDXL into generating manga pages
// (collage of panels) instead of a single illustration. Replace with safer aesthetic words.
const POSITIVE_REWRITES: Array<[RegExp, string]> = [
	[/\bmanga panel\b/gi, 'solo'],
	[/\bmanga page\b/gi, 'solo']
];

// Tags to drop when ControlNet handles composition — scribble defines framing,
// these only fight against the user's actual sketch.
const STRIP_WHEN_SCRIBBLE = [
	/\b(wide|medium|close[-_ ]?up|extreme[-_ ]?wide|extreme[-_ ]?close[-_ ]?up|insert|establishing|long|full)[-_ ]?shot\b/gi,
	/\b(high|low|eye[-_ ]?level|dutch|bird['s]*[-_ ]?eye|worm['s]*[-_ ]?eye|over[-_ ]?the[-_ ]?shoulder|flat)[-_ ]?angle\b/gi,
	/\b\d+(\.\d+)?[-_ ]?mm[-_ ]?lens\b/gi,
	/\b(dim|harsh|soft|dramatic|natural|warm|cool)[-_ ]?(light|lighting|streetlight)\b/gi,
	/\b(oppressive|melancholy|melancholic|tense|cinematic)[-_ ]?(mood|atmosphere)?\b/gi
];

// AnimagineXL 4.0 native quality booster format — appended at the END of positive.
// Per official docs (Cagliostro Research Lab).
const QUALITY_SUFFIX = ', masterpiece, high score, great score, absurdres';

// AnimagineXL 4.0 native negative prompt + anti-collage extras for our use case.
const DEFAULT_NEGATIVE = [
	'lowres', 'worst quality', 'low quality', 'normal quality', 'bad anatomy', 'bad hands',
	'4koma', 'comic', 'greyscale', 'monochrome',
	'watermark', 'signature', 'jpeg artifacts', 'logo',
	'multiple panels', 'comic page layout', 'tiled grid', 'collage', 'montage',
	'multiple frames', 'split screen',
	'photograph', 'photorealistic', '3d render',
	'wings', 'nsfw'
].join(', ');

const STYLE_PRESETS: Record<string, { positive: string; negative?: string }> = {
	default: { positive: '' },
	none: { positive: '' },
	lineart: { positive: 'lineart, monochrome, ink drawing, clean line art, black and white' },
	watercolor: { positive: 'watercolor painting, soft brushstrokes, flowing colors, paper texture' },
	'oil painting': { positive: 'oil painting, thick impasto brushstrokes, classical art, painterly' },
	anime: { positive: 'anime style, cel shading, vibrant colors, manga aesthetic' },
	'3d render': { positive: '3d render, octane render, ray tracing, volumetric lighting, cgi' },
	photoreal: { positive: 'photorealistic, photograph, hyperdetailed, 8k, sharp focus, real life' },
	'pencil sketch': { positive: 'pencil sketch, graphite drawing, hatching, paper texture, monochrome' }
};

function safeFilename(panel: any, version: number): string {
	const id = String(panel['@id'] || `p${panel.panel ?? '?'}`).replace(/[^a-zA-Z0-9_-]+/g, '_');
	return `${id}_sketch_v${version}.png`;
}

function decodeBase64Png(input: string): Buffer {
	const m = input.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.*)$/);
	const b64 = m ? m[1] : input;
	return Buffer.from(b64, 'base64');
}

function panelText(panel: any): string {
	const dialogue = Array.isArray(panel.dialogue)
		? panel.dialogue.map((d: any) => [d.text, d['gh:emotion'], d.emotion].filter(Boolean).join(' ')).join(' ')
		: '';
	return [
		panel.visual,
		panel['gh:visual'],
		panel['gh:imagePrompt'],
		panel['gh:sdxlPrompt'],
		dialogue
	].filter(Boolean).join(' ').toLowerCase();
}

function variantSeed(panel: any, characterName: string, characterOrder: number): number {
	const source = [
		panel['@id'],
		panel.panel,
		panel['gh:panelIndex'],
		panel.visual,
		panel['gh:visual'],
		characterName,
		characterOrder
	].filter(Boolean).join('|');
	let hash = 0;
	for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
	return hash;
}

function pickVariant(options: Array<{ slug: string; note: string }>, seed: number): { slug: string; note: string } {
	return options[seed % options.length] ?? options[0]!;
}

function chooseReferenceVariant(panel: any, characterName: string, characterOrder: number): { slug: string; note: string } {
	const text = panelText(panel);
	const shot = String(panel.shot || '').toLowerCase();
	const seed = variantSeed(panel, characterName, characterOrder);
	const isRen = /^(ren|renmiddleschool)$/i.test(characterName);
	if (/profile|side profile|横顔|横向き/.test(text)) {
		return pickVariant([
			{ slug: 'profile_left', note: 'side profile facing left' },
			{ slug: 'profile_right', note: 'side profile facing right' }
		], seed);
	}
	if (/down|lowered|floor|guilty|sad|cry|tear|pain|苦|悲|泣|罪悪|うつむ|俯|下を向|胸を押さ/.test(text)) {
		return pickVariant([
			{ slug: 'downcast_sad', note: 'downcast sad/guilty expression' },
			{ slug: 'anxious_front', note: 'anxious front-facing expression' },
			{ slug: 'three_quarter_left_neutral', note: 'quiet tense three-quarter left angle' },
			{ slug: 'profile_left', note: 'withdrawn side profile' }
		], seed);
	}
	if (/surpris|shock|widened|えっ|驚|愕然|凍った|まさか/.test(text)) {
		return pickVariant([
			{ slug: 'surprised_front', note: 'surprised front-facing expression' },
			{ slug: 'three_quarter_right_neutral', note: 'startled three-quarter right angle' },
			{ slug: 'anxious_front', note: 'anxious shocked expression' }
		], seed);
	}
	if (/angry|anger|annoy|睨|怒|罵|責め|最悪|絶縁/.test(text)) {
		return pickVariant([
			{ slug: 'angry_3q_left', note: 'angry three-quarter angle' },
			{ slug: 'profile_right', note: 'tense side profile' },
			{ slug: 'anxious_front', note: 'strained anxious expression' },
			{ slug: 'focused_3q_right', note: 'sharp focused three-quarter angle' }
		], seed);
	}
	if (isRen && /focus|analy|hack|type|monitor|screen|log|調査|集中|解析|ハック|追う|確認/.test(text)) {
		return pickVariant([
			{ slug: 'focused_3q_right', note: 'focused analytical three-quarter angle' },
			{ slug: 'three_quarter_left_neutral', note: 'focused three-quarter left angle' },
			{ slug: 'profile_right', note: 'focused side profile' },
			{ slug: 'downcast_sad', note: 'sleepy downward focused expression' }
		], seed);
	}
	if (/smile|laugh|笑|冗談|柔らか|優し/.test(text)) {
		return pickVariant([
			{ slug: 'gentle_smile_3q', note: 'subtle gentle smile' },
			{ slug: 'three_quarter_left_neutral', note: 'soft three-quarter angle' },
			{ slug: 'profile_left', note: 'small side-facing smile' }
		], seed);
	}
	if (/shout|battle|axe|slash|attack|叫|斧|戦|襲|daemon|ghost|null/.test(text)) {
		return pickVariant([
			{ slug: 'action_shout', note: 'dynamic action expression' },
			{ slug: 'angry_3q_left', note: 'combat-ready angry three-quarter angle' },
			{ slug: 'profile_right', note: 'dynamic side-facing action pose' },
			{ slug: 'focused_3q_right', note: 'focused action expression' }
		], seed);
	}
	if (/sleep|tired|bored|lazy|怠惰|眠|ねむ|寝|だる/.test(text)) {
		return pickVariant([
			{ slug: 'downcast_sad', note: 'sleepy downward bored expression' },
			{ slug: 'profile_left', note: 'sleepy side profile' },
			{ slug: 'three_quarter_right_neutral', note: 'half-awake three-quarter angle' }
		], seed);
	}
	if (/close/.test(shot) || /close[- ]?up|アップ/.test(text)) {
		return pickVariant([
			{ slug: 'three_quarter_left_neutral', note: 'neutral three-quarter left close-up' },
			{ slug: 'three_quarter_right_neutral', note: 'neutral three-quarter right close-up' },
			{ slug: 'neutral_front', note: 'neutral front-facing close-up' },
			{ slug: 'profile_left', note: 'close-up side profile' }
		], seed);
	}
	const fallback = ([
		'neutral_front',
		'three_quarter_left_neutral',
		'three_quarter_right_neutral',
		'profile_left',
		'profile_right',
		'anxious_front',
		'gentle_smile_3q'
	][seed % 7]) ?? 'neutral_front';
	return { slug: fallback, note: `varied fallback angle: ${fallback}` };
}

function sceneControlPrompt(panel: any, characterCount: number): string {
	const text = panelText(panel);
	const shot = String(panel.shot || '').toLowerCase();
	const notes: string[] = [];
	if (/insert/i.test(shot)) {
		notes.push('This is an INSERT shot. Make the described object, device screen, message, button, document, or prop the main subject. Do not turn this into a character portrait.');
		if (characterCount === 0) notes.push('No people should appear unless the description explicitly asks for a hand.');
	}
	if (/wide|establishing/i.test(shot) || /全景|部屋全体|教室全体|下校路|廊下|壁/.test(text)) {
		notes.push('Use a true wide spatial composition. Show the room or location clearly before any character close-up. Characters must be small enough that the setting remains readable.');
	}
	if (/screen|monitor|smartphone|phone|sms|dm|通知|画面|ログイン|認証番号|エラー|リンク|レビュー|チャット|端末|モニター|スマホ|メッセ|メール|リスト|ui|url/i.test(text)) {
		notes.push('If a screen or UI is described, frame it clearly as the main visual element. Use simple readable Japanese labels when possible and avoid unrelated UI text.');
	}
	if (/ghost|daemon|null axe|slash|attack|battle|斧|ゴースト|デーモン|襲|戦|斬|一閃|鎖|消滅/i.test(text)) {
		notes.push('For action or supernatural panels, prioritize full-body action, clear motion, Ghost/Daemon forms, energy effects, classroom scale, and the described attack. Avoid static bust portraits.');
	}
	if (/渡す|掴|逃げ|置く|送信|電話|指差|歩|倒|吹き飛|立ち上が|抱きしめ|食べ/.test(text)) {
		notes.push('Depict the specified physical action clearly, with hands, props, and body language visible.');
	}
	return notes.join(' ');
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const {
		episodeId,
		pageNumber,
		panelIndex,
		image,
		scribble,
		aiStrength,
		style,
		extraPositive,
		seed,
		persist,
		checkpoint,
		preprocessScribble,
		refine,
		refineDenoise,
		refineSteps,
		engine,
		panelArrayIndex,
		imageQuality
	} = body as {
		episodeId?: string;
		pageNumber?: number;
		panelIndex?: number;
		panelArrayIndex?: number;
		imageQuality?: 'low' | 'medium' | 'high' | 'auto';
		image?: string;
		scribble?: string;
		aiStrength?: number;
		style?: string;
		extraPositive?: string;
		seed?: number;
		persist?: boolean;
		checkpoint?: string;
		preprocessScribble?: 'scribble' | 'lineart' | 'canny' | false;
		refine?: boolean;
		refineDenoise?: number;
		refineSteps?: number;
		engine?: 'openai' | 'sdxl';
	};
	if (!episodeId || pageNumber == null || panelIndex == null || !image) {
		throw error(400, 'episodeId, pageNumber, panelIndex, image required');
	}

	const found = await findEpisode(episodeId);
	if (!found) throw error(404, `Episode not found: ${episodeId}`);
	const sourceData = JSON.parse(await fsReadFile(found.sourcePath, 'utf-8'));
	const pages = sourceData['gh:pages'] as any[] ?? [];
	const page = pages.find((pg) => pg['gh:pageNumber'] === pageNumber);
	if (!page) throw error(404, `Page ${pageNumber} not found`);
	const panels = page['gh:panels'] as any[] ?? [];
	const panel = panelArrayIndex != null && panels[panelArrayIndex]
		? panels[panelArrayIndex]
		: panels.find((pn) => {
			const pi = pn['gh:panelIndex'] ?? pn['panel'];
			return pi === panelIndex;
		}) ?? panels.find((pn) => {
			const pi = pn['gh:panelIndex'] ?? pn['panel'];
			return pi === panelIndex + 1;
		});
	if (!panel) throw error(404, `Panel ${panelIndex} not found`);

	const baseTags = Array.isArray(panel['gh:sdxlTags']) ? (panel['gh:sdxlTags'] as string[]).join(', ') : '';
	const basePositive = (panel['gh:sdxlPrompt'] as string)
		|| (panel['gh:imagePrompt'] as string)
		|| (panel.visual as string)
		|| (panel['gh:visual'] as string)
		|| baseTags
		|| '';
	const styleAdd = STYLE_PRESETS[(style || 'default').toLowerCase()]?.positive ?? '';
	let positive = [styleAdd, basePositive, extraPositive].filter(Boolean).join(', ');
	for (const [pattern, replacement] of POSITIVE_REWRITES) positive = positive.replace(pattern, replacement);

	// When user provides a scribble (ControlNet path), strip composition/lighting tags
	// that compete with the sketch.
	const hasScribble = !!scribble;
	if (hasScribble) {
		for (const re of STRIP_WHEN_SCRIBBLE) positive = positive.replace(re, '');
	}
	// Append AnimagineXL 4.0 native quality boosters at the END (per official spec).
	positive = positive
		.replace(/,\s*,+/g, ',')
		.replace(/^\s*,\s*|\s*,\s*$/g, '')
		.trim();
	positive = positive + QUALITY_SUFFIX;

	// Apply per-checkpoint prompt scaffolding (Pony score tags, etc.)
	const ckptCfg = getCheckpointConfig(checkpoint);
	if (ckptCfg.positivePrefix) positive = ckptCfg.positivePrefix + positive;

	const panelNegative = Array.isArray(panel['gh:sdxlNegative']) ? (panel['gh:sdxlNegative'] as string[]).join(', ') : '';
	const negative = [DEFAULT_NEGATIVE, panelNegative, ckptCfg.negativeAppend].filter(Boolean).join(', ');

	// Engine selection: default = openai (cloud, high quality, manga-style).
	// Override with engine: 'sdxl' to use the ComfyUI / AnimagineXL pipeline (free, faster, scribble-aware).
	const useEngine: 'openai' | 'sdxl' = engine === 'sdxl' ? 'sdxl' : (engine === 'openai' ? 'openai' : 'openai');

	if (useEngine === 'openai') {
		const panelVisual = [
			panel.visual,
			panel['gh:visual'],
			panel['gh:imagePrompt']
		].filter(Boolean).join(' ');
		const hasNamedCharacterInVisual = /\b(ren|nei|yuto|akira|mei|saki)\b/i.test(panelVisual)
			|| /(蓮|寧|悠斗|彰|美依|咲|人物|少年|少女)/.test(panelVisual);
		const isObjectInsert = /insert/i.test(String(panel.shot || '')) && !hasNamedCharacterInVisual;
		const characterIds: string[] = isObjectInsert
			? []
			: (panel['gh:characters'] ?? panel['characters'] ?? []).map((c: string) => String(c).replace(/^character:/, ''));
		const referenceImages: Buffer[] = [];
		const referenceSelections: Array<{ character: string; variant: string; note: string }> = [];
		for (const [characterOrder, name] of characterIds.slice(0, 5).entries()) {
			const refPath = join(projectRoot(), 'resources', 'characters', name, 'reference.png');
			if (!existsSync(refPath)) continue;
			const selected = chooseReferenceVariant(panel, name, characterOrder);
			const variantPath = join(projectRoot(), 'resources', 'characters', name, 'reference_variants', `${selected.slug}.png`);
			const facePath = existsSync(variantPath)
				? variantPath
				: join(projectRoot(), 'resources', 'characters', name, 'reference_face.png');
			if (existsSync(facePath)) {
				referenceImages.push(await fsReadFile(facePath));
				referenceSelections.push({ character: name, variant: existsSync(variantPath) ? selected.slug : 'reference_face', note: selected.note });
			} else {
				const full = await fsReadFile(refPath);
				const faceBuf = cropFaceRegion(full, 0.42);
				await writeFile(facePath, faceBuf);
				referenceImages.push(faceBuf);
				referenceSelections.push({ character: name, variant: 'reference_face', note: selected.note });
			}
		}
		// Strip SDXL-specific tag scaffolding for natural-language image-gen.
		const cleanPrompt = positive
			.replace(/\btext\s+['"][^'"]*['"]/gi, 'subtle unread message preview')
			.replace(/\bteen\s+(boy|girl)\b/gi, (_m, g) => g.toLowerCase() === 'boy' ? 'male student' : 'female student')
			.replace(/\bbedroom\b/gi, 'private room')
			.replace(/, masterpiece, high score, great score, absurdres$/, '')
			.replace(/\bsolo\b/g, '')
			.replace(/\b1(boy|girl)\b/g, (_m, g) => g === 'boy' ? '1 male character' : '1 female character');
		const referenceNote = referenceImages.length
			? ` Use the supplied face reference image(s) only for character identity: face shape, eye design, hairstyle, age impression, and manga line style. The supplied references may use different face angles and expressions; follow those angle/expression cues only when they match the current scene. Do not preserve the reference outfit, clothing, body pose, background, or props. Clothing must follow the current scene description, school setting, and panel prompt. Generate a new single-panel storyboard image for the described scene. Reference selections: ${referenceSelections.map((r) => `${r.character}:${r.variant}`).join(', ')}.`
			: '';
			const controlNote = sceneControlPrompt(panel, referenceImages.length);
			const prompt = `Anime / manga panel illustration. ${cleanPrompt}. ${controlNote}${referenceNote}`;
		const useLayeredGraph = referenceImages.length > 0 && process.env.OPENAI_IMAGE_PIPELINE !== 'single-pass-reference';
		const oai = useLayeredGraph
			? await generateLayeredStoryboardImage({
					prompt: `Anime / manga panel illustration. ${cleanPrompt}. ${controlNote}`,
				characterPrompt: prompt,
				referenceImages,
				...(imageQuality ? { quality: imageQuality } : {}),
				shot: String(panel.shot || ''),
				panelText: panelText(panel)
			})
			: await generateOpenAIImage({
				prompt,
				...(imageQuality ? { quality: imageQuality } : {}),
				...(referenceImages.length ? { referenceImages } : {})
			});

		if (!persist) {
			return new Response(oai.bytes, {
				headers: {
					'Content-Type': 'image/png',
					'X-Engine': 'openai',
					'X-Duration-Ms': String(oai.durationMs)
				}
			});
		}

		const existing: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
		const nextVersion = existing.length + 1;
		const filename = safeFilename(panel, nextVersion);
		const relDir = join('episodes', episodeId, 'pages', String(pageNumber));
		const absDir = join(imagesDir(), relDir);
		await mkdir(absDir, { recursive: true });
		await writeFile(join(absDir, filename), oai.bytes);
		const imageUrl = `/images/${relDir}/${filename}`.replace(/\\/g, '/');
		const newEntry: Record<string, unknown> = {
			'gh:imageUrl': imageUrl,
			'gh:imagePrompt': prompt,
			'gh:generatedAt': Math.floor(Date.now() / 1000),
			'gh:model': `openai/${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'}`,
			...(useLayeredGraph ? {
				'gh:generationPipeline': 'langgraph-layered-background-mask-character-edit',
				'gh:generationStages': (oai as any).stages
			} : {}),
			...(referenceImages.length ? { 'gh:referenceCharacters': characterIds.slice(0, 5) } : {}),
			...(referenceSelections.length ? { 'gh:referenceSelections': referenceSelections } : {}),
			'gh:durationMs': oai.durationMs
		};
		panel['gh:generatedImages'] = [...existing, newEntry];
		panel['gh:currentImageIndex'] = panel['gh:generatedImages'].length - 1;
		panel['gh:generatedImageUrl'] = imageUrl;
		await saveJsonLd(found.sourcePath, sourceData);
		return json({
			success: true,
			project: getActiveProject(),
			imageUrl,
			engine: 'openai',
			durationMs: oai.durationMs,
			index: panel['gh:currentImageIndex']
		});
	}

	// SDXL / ComfyUI pipeline (engine: 'sdxl')
	const initImage = decodeBase64Png(image);
	// Refine mode: skip scribble entirely; use the supplied image (the realtime preview)
	// as init for a high-quality polish pass with low denoise + more steps.
	const scribbleImage = !refine && scribble ? decodeBase64Png(scribble) : undefined;
	const denoise = refine
		? Math.min(0.6, Math.max(0.2, refineDenoise ?? 0.35))
		: Math.min(0.95, Math.max(0.1, (aiStrength ?? 60) / 100));

	// Resolve characters → load reference images. Up to 5 supported by IPAdapterCombineEmbeds.
	const characterIds: string[] = (panel['gh:characters'] ?? panel['characters'] ?? []).map((c: string) => String(c).replace(/^character:/, ''));
	const charsWithRefs: { name: string; ref: Buffer }[] = [];
	for (const name of characterIds.slice(0, 5)) {
		const refPath = join(projectRoot(), 'resources', 'characters', name, 'reference.png');
		if (!existsSync(refPath)) continue;
		// Cache face crops next to the source ref so we only crop once per character.
		const facePath = join(projectRoot(), 'resources', 'characters', name, 'reference_face.png');
		let faceBuf: Buffer;
		if (existsSync(facePath)) {
			faceBuf = await fsReadFile(facePath);
		} else {
			const full = await fsReadFile(refPath);
			faceBuf = cropFaceRegion(full, 0.42);
			await writeFile(facePath, faceBuf);
		}
		charsWithRefs.push({ name, ref: faceBuf });
	}
	const refBuffers = charsWithRefs.map((c) => c.ref);

	// Single sketch pass with combined IPA-Face embeds. Trust the prompt + tags
	// to place each character; no spatial detection needed.
	// Quality-first defaults: skip Lightning LoRA so we get full 25-step AnimagineXL
	// rendering, and dial the scribble down so it acts as a soft composition hint
	// rather than literal pen strokes.
	const ipaActive = refBuffers.length > 0;
	const baseScribbleStrength = scribbleImage ? 0.45 : undefined;
	const scribbleStrength = ipaActive && baseScribbleStrength
		? baseScribbleStrength * 0.6
		: baseScribbleStrength;

	const result = await generateSdxlImg2Img({
		positive,
		negative,
		initImage,
		denoise,
		seed,
		checkpoint,
		scribbleImage,
		scribbleStrength,
		preprocessScribble: refine ? false : (preprocessScribble === undefined ? 'canny' : preprocessScribble),
		steps: refine ? (refineSteps ?? 30) : undefined,
		faceReferenceImages: refBuffers.length ? refBuffers : undefined,
		faceReferenceWeight: charsWithRefs.length > 1 ? 0.55 : 0.7,
		disableLightning: true
	});

	const faceReferenceCharacter = charsWithRefs[0]?.name;

	if (!persist) {
		return new Response(result.bytes, {
			headers: {
				'Content-Type': 'image/png',
				'X-Sdxl-Seed': String(result.seed),
				'X-Sdxl-Duration-Ms': String(result.durationMs)
			}
		});
	}

	const existing: any[] = Array.isArray(panel['gh:generatedImages']) ? panel['gh:generatedImages'] : [];
	const nextVersion = existing.length + 1;
	const filename = safeFilename(panel, nextVersion);
	const relDir = join('episodes', episodeId, 'pages', String(pageNumber));
	const absDir = join(imagesDir(), relDir);
	await mkdir(absDir, { recursive: true });
	await writeFile(join(absDir, filename), result.bytes);

	const imageUrl = `/images/${relDir}/${filename}`.replace(/\\/g, '/');
	const newEntry: Record<string, unknown> = {
		'gh:imageUrl': imageUrl,
		'gh:imagePrompt': positive,
		'gh:negativePrompt': negative,
		'gh:generatedAt': Math.floor(Date.now() / 1000),
		'gh:model': (refine ? 'refined:' : '') + (charsWithRefs.length > 1
			? `sdxl/animaginexl-4.0+ipa-multi(${charsWithRefs.map((c) => c.name).join(',')})`
			: faceReferenceCharacter
				? `sdxl/animaginexl-4.0+ipa-face(${faceReferenceCharacter})`
				: 'sdxl/animaginexl-4.0-img2img'),
		'gh:seed': result.seed,
		'gh:sdxlDenoise': denoise,
		'gh:sdxlStyle': style || 'default',
		'gh:sdxlDurationMs': result.durationMs
	};
	if (faceReferenceCharacter) newEntry['gh:faceReference'] = faceReferenceCharacter;
	panel['gh:generatedImages'] = [...existing, newEntry];
	panel['gh:currentImageIndex'] = panel['gh:generatedImages'].length - 1;
	panel['gh:generatedImageUrl'] = imageUrl;
	await saveJsonLd(found.sourcePath, sourceData);

	return json({
		success: true,
		project: getActiveProject(),
		imageUrl,
		seed: result.seed,
		durationMs: result.durationMs,
		index: panel['gh:currentImageIndex']
	});
};
