/**
 * ComfyUI HTTP client. Submits a text2img workflow, polls until complete,
 * and returns the resulting PNG bytes.
 */
import { randomUUID } from 'node:crypto';
import { getCheckpointConfig } from './checkpoint-config';

export interface SdxlRequest {
	positive: string;
	negative: string;
	checkpoint?: string;
	width?: number;
	height?: number;
	steps?: number;
	cfg?: number;
	sampler?: string;
	scheduler?: string;
	seed?: number;
}

export interface SdxlImg2ImgRequest extends SdxlRequest {
	initImage: Buffer;
	denoise?: number;
	scribbleImage?: Buffer;
	scribbleStrength?: number;
	faceReferenceImage?: Buffer;
	faceReferenceImages?: Buffer[];
	faceReferenceWeight?: number;
	disableLightning?: boolean;
	preprocessScribble?: 'scribble' | 'lineart' | 'canny' | false;
}

export interface SdxlInpaintRequest extends SdxlRequest {
	initImage: Buffer;
	maskImage: Buffer;
	denoise?: number;
	faceReferenceImage?: Buffer;
	faceReferenceWeight?: number;
}

export interface SdxlResult {
	bytes: Buffer;
	filename: string;
	seed: number;
	promptId: string;
	durationMs: number;
}

function podUrl(): string {
	const url = process.env.SDXL_POD_URL;
	if (!url) throw new Error('SDXL_POD_URL not set');
	return url.replace(/\/$/, '');
}

function defaultCheckpoint(): string {
	return process.env.SDXL_DEFAULT_CHECKPOINT || 'animagine-xl-4.0.safetensors';
}

function buildWorkflow(req: Required<Omit<SdxlRequest, 'seed'>> & { seed: number }): Record<string, unknown> {
	return {
		'4': {
			class_type: 'CheckpointLoaderSimple',
			inputs: { ckpt_name: req.checkpoint }
		},
		'6': {
			class_type: 'CLIPTextEncode',
			inputs: { text: req.positive, clip: ['4', 1] }
		},
		'7': {
			class_type: 'CLIPTextEncode',
			inputs: { text: req.negative, clip: ['4', 1] }
		},
		'5': {
			class_type: 'EmptyLatentImage',
			inputs: { width: req.width, height: req.height, batch_size: 1 }
		},
		'3': {
			class_type: 'KSampler',
			inputs: {
				seed: req.seed,
				steps: req.steps,
				cfg: req.cfg,
				sampler_name: req.sampler,
				scheduler: req.scheduler,
				denoise: 1,
				model: ['4', 0],
				positive: ['6', 0],
				negative: ['7', 0],
				latent_image: ['5', 0]
			}
		},
		'8': {
			class_type: 'VAEDecode',
			inputs: { samples: ['3', 0], vae: ['4', 2] }
		},
		'9': {
			class_type: 'SaveImage',
			inputs: { filename_prefix: 'gh_sdxl', images: ['8', 0] }
		}
	};
}

async function pollHistory(promptId: string, timeoutMs: number): Promise<any> {
	const base = podUrl();
	const start = Date.now();
	let delay = 500;
	while (Date.now() - start < timeoutMs) {
		const res = await fetch(`${base}/history/${promptId}`);
		if (res.ok) {
			const json = (await res.json()) as Record<string, any>;
			const entry = json[promptId];
			if (entry && entry.status?.completed) return entry;
			if (entry && entry.status?.status_str === 'error') {
				throw new Error(`ComfyUI error: ${JSON.stringify(entry.status.messages ?? entry.status).slice(0, 400)}`);
			}
		}
		await new Promise((r) => setTimeout(r, delay));
		delay = Math.min(delay * 1.4, 3000);
	}
	throw new Error(`ComfyUI timeout after ${timeoutMs}ms (prompt ${promptId})`);
}

let lightningCache: { name: string; available: true } | null = null;
async function isLightningAvailable(loraName: string): Promise<boolean> {
	if (lightningCache && lightningCache.name === loraName) return true;
	try {
		const res = await fetch(`${podUrl()}/object_info/LoraLoader`);
		const json = (await res.json()) as any;
		const list: string[] = json?.LoraLoader?.input?.required?.lora_name?.[0] ?? [];
		if (list.includes(loraName)) { lightningCache = { name: loraName, available: true }; return true; }
		console.warn(`[comfyui] Lightning LoRA "${loraName}" not on pod yet; using 20-step fallback.`);
		return false;
	} catch (err) {
		console.warn('[comfyui] Failed to query LoraLoader:', err);
		return false;
	}
}

let scribbleCache: { name: string; available: true } | null = null;
async function isScribbleAvailable(cnName: string): Promise<boolean> {
	if (scribbleCache && scribbleCache.name === cnName) return true;
	try {
		const res = await fetch(`${podUrl()}/object_info/ControlNetLoader`);
		const json = (await res.json()) as any;
		const list: string[] = json?.ControlNetLoader?.input?.required?.control_net_name?.[0] ?? [];
		if (list.includes(cnName)) { scribbleCache = { name: cnName, available: true }; return true; }
		console.warn(`[comfyui] Scribble ControlNet "${cnName}" not on pod yet; using plain img2img.`);
		return false;
	} catch (err) {
		console.warn('[comfyui] Failed to query ControlNetLoader:', err);
		return false;
	}
}

let ipaCache: boolean | null = null;
export async function isIPAdapterAvailable(): Promise<boolean> {
	if (ipaCache !== null) return ipaCache;
	try {
		const res = await fetch(`${podUrl()}/object_info`);
		const json = (await res.json()) as any;
		const has = !!(json?.IPAdapterUnifiedLoader || json?.IPAdapterAdvanced);
		ipaCache = has;
		if (!has) console.warn('[comfyui] IP-Adapter nodes not registered; skipping face conditioning.');
		return has;
	} catch {
		return false;
	}
}

async function uploadImage(bytes: Buffer, name = `gh_init_${Date.now()}.png`): Promise<{ name: string; subfolder: string; type: string }> {
	const base = podUrl();
	const form = new FormData();
	const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
	form.append('image', blob, name);
	form.append('type', 'input');
	form.append('overwrite', 'true');
	const res = await fetch(`${base}/upload/image`, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`ComfyUI /upload/image HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
	return (await res.json()) as { name: string; subfolder: string; type: string };
}

function buildImg2ImgWorkflow(
	uploadedName: string,
	req: Required<Omit<SdxlImg2ImgRequest, 'seed' | 'initImage' | 'scribbleImage' | 'scribbleStrength' | 'faceReferenceImage' | 'faceReferenceImages' | 'faceReferenceWeight' | 'disableLightning'>> & {
		seed: number;
		lightningLora?: string;
		scribbleControlnet?: string;
		scribbleUploadedName?: string;
		scribbleStrength?: number;
		faceReferenceUploadedNames?: string[];
		faceReferenceWeight?: number;
		preprocessScribble?: 'scribble' | 'lineart' | 'canny' | false;
		isVpred?: boolean;
	}
): Record<string, unknown> {
	const useLightning = !!req.lightningLora;
	const useScribble = !!req.scribbleControlnet && !!req.scribbleUploadedName;
	const faceRefs = req.faceReferenceUploadedNames ?? [];
	const useFaceIPA = faceRefs.length > 0;
	let modelRef: [string, number] = useLightning ? ['12', 0] : ['4', 0];
	const clipRef: [string, number] = useLightning ? ['12', 1] : ['4', 1];


	let positiveCond: [string, number] = ['6', 0];
	let negativeCond: [string, number] = ['7', 0];

	const wf: Record<string, unknown> = {
		'4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: req.checkpoint } },
		'10': { class_type: 'LoadImage', inputs: { image: uploadedName } },
		'11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
		'5': { class_type: 'EmptyLatentImage', inputs: { width: req.width, height: req.height, batch_size: 1 } },
		'6': { class_type: 'CLIPTextEncode', inputs: { text: req.positive, clip: clipRef } },
		'7': { class_type: 'CLIPTextEncode', inputs: { text: req.negative, clip: clipRef } }
	};

	if (useLightning) {
		wf['12'] = {
			class_type: 'LoraLoader',
			inputs: {
				lora_name: req.lightningLora,
				strength_model: 1.0,
				strength_clip: 1.0,
				model: ['4', 0],
				clip: ['4', 1]
			}
		};
	}

	// V-prediction models (NoobAI Vpred) need ModelSamplingDiscrete = v_prediction
	// inserted between the model loader (or LoRA) and downstream nodes.
	if (req.isVpred) {
		wf['50'] = {
			class_type: 'ModelSamplingDiscrete',
			inputs: { model: modelRef, sampling: 'v_prediction', zsnr: false }
		};
		modelRef = ['50', 0];
	}

	if (useScribble) {
		wf['20'] = { class_type: 'ControlNetLoader', inputs: { control_net_name: req.scribbleControlnet } };
		wf['21'] = { class_type: 'LoadImage', inputs: { image: req.scribbleUploadedName } };
		// Pre-process the raw user scribble. Built-in `Canny` works without extra installs;
		// `lineart`/`scribble` need ComfyUI ControlNet Aux.
		const cnImageRef: [string, number] = req.preprocessScribble
			? (() => {
				if (req.preprocessScribble === 'canny') {
					wf['23'] = {
						class_type: 'Canny',
						inputs: { image: ['21', 0], low_threshold: 0.1, high_threshold: 0.3 }
					};
				} else {
					wf['23'] = {
						class_type: req.preprocessScribble === 'lineart' ? 'LineArtPreprocessor' : 'ScribblePreprocessor',
						inputs: { image: ['21', 0], resolution: 1024 }
					};
				}
				return ['23', 0];
			})()
			: ['21', 0];
		wf['22'] = {
			class_type: 'ControlNetApplyAdvanced',
			inputs: {
				strength: req.scribbleStrength ?? 0.85,
				start_percent: 0,
				end_percent: 1,
				positive: ['6', 0],
				negative: ['7', 0],
				control_net: ['20', 0],
				image: cnImageRef,
				vae: ['4', 2]
			}
		};
		positiveCond = ['22', 0];
		negativeCond = ['22', 1];
	}

	// IP-Adapter Face: condition the model on character reference images.
	// 1 char  → IPAdapterAdvanced with the single image (simpler, slightly cleaner).
	// 2+ char → encode each, combine via IPAdapterCombineEmbeds, apply via IPAdapterEmbeds.
	if (useFaceIPA) {
		wf['40'] = {
			class_type: 'IPAdapterUnifiedLoader',
			inputs: { preset: 'PLUS FACE (portraits)', model: modelRef }
		};
		const refWeight = req.faceReferenceWeight ?? 0.7;
		if (faceRefs.length === 1) {
			wf['41'] = { class_type: 'LoadImage', inputs: { image: faceRefs[0] } };
			wf['42'] = {
				class_type: 'IPAdapterAdvanced',
				inputs: {
					model: ['40', 0], ipadapter: ['40', 1], image: ['41', 0],
					weight: refWeight, weight_type: 'linear', combine_embeds: 'concat',
					start_at: 0, end_at: 0.85, embeds_scaling: 'V only'
				}
			};
			modelRef = ['42', 0];
		} else {
			// Stack IPAdapterAdvanced calls — each ref conditions the model in sequence.
			// Per-ref weight is reduced because they compound.
			const stackWeight = Math.min(0.7, refWeight) / Math.sqrt(faceRefs.length);
			let prevModel: [string, number] = ['40', 0];
			faceRefs.forEach((name, i) => {
				const lid = `41_${i}`;
				const aid = `42_${i}`;
				wf[lid] = { class_type: 'LoadImage', inputs: { image: name } };
				wf[aid] = {
					class_type: 'IPAdapterAdvanced',
					inputs: {
						model: prevModel,
						ipadapter: ['40', 1],
						image: [lid, 0],
						weight: stackWeight,
						weight_type: 'linear',
						combine_embeds: 'concat',
						start_at: 0,
						end_at: 0.85,
						embeds_scaling: 'V only'
					}
				};
				prevModel = [aid, 0];
			});
			modelRef = prevModel;
		}
	}

	// With ControlNet active, start from empty latent for full T2I conditioned by scribble.
	// Without ControlNet, use the encoded init image (img2img refinement).
	const latentRef: [string, number] = useScribble ? ['5', 0] : ['11', 0];
	const ksamplerDenoise = useScribble ? 1.0 : req.denoise;
	wf['3'] = {
		class_type: 'KSampler',
		inputs: {
			seed: req.seed, steps: req.steps, cfg: req.cfg,
			sampler_name: req.sampler, scheduler: req.scheduler,
			denoise: ksamplerDenoise,
			model: modelRef, positive: positiveCond, negative: negativeCond,
			latent_image: latentRef
		}
	};
	wf['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } };
	wf['9'] = { class_type: 'SaveImage', inputs: { filename_prefix: 'gh_sdxl_i2i', images: ['8', 0] } };

	return wf;
}

export interface SdxlInpaintIPARequest {
	initImage: Buffer;
	maskImage: Buffer;
	characterRefImage: Buffer;
	positive: string;
	negative?: string;
	denoise?: number;
	checkpoint?: string;
	width?: number;
	height?: number;
	seed?: number;
	ipaWeight?: number;
}

function buildInpaintIPAWorkflow(params: {
	initName: string;
	maskName: string;
	refName: string;
	positive: string;
	negative: string;
	checkpoint: string;
	denoise: number;
	steps: number;
	cfg: number;
	sampler: string;
	scheduler: string;
	seed: number;
	ipaWeight: number;
	lightningLora?: string;
}): Record<string, unknown> {
	const useLightning = !!params.lightningLora;
	let modelRef: [string, number] = useLightning ? ['12', 0] : ['4', 0];
	const clipRef: [string, number] = useLightning ? ['12', 1] : ['4', 1];

	const wf: Record<string, unknown> = {
		'4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: params.checkpoint } },
		'10': { class_type: 'LoadImage', inputs: { image: params.initName } },
		'13': { class_type: 'LoadImage', inputs: { image: params.maskName } },
		'14': { class_type: 'ImageToMask', inputs: { image: ['13', 0], channel: 'red' } },
		'11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
		'15': { class_type: 'SetLatentNoiseMask', inputs: { samples: ['11', 0], mask: ['14', 0] } },
		'6': { class_type: 'CLIPTextEncode', inputs: { text: params.positive, clip: clipRef } },
		'7': { class_type: 'CLIPTextEncode', inputs: { text: params.negative, clip: clipRef } },
		'16': { class_type: 'LoadImage', inputs: { image: params.refName } }
	};
	if (useLightning) {
		wf['12'] = {
			class_type: 'LoraLoader',
			inputs: {
				lora_name: params.lightningLora,
				strength_model: 1.0, strength_clip: 1.0,
				model: ['4', 0], clip: ['4', 1]
			}
		};
	}
	wf['17'] = {
		class_type: 'IPAdapterUnifiedLoader',
		inputs: { preset: 'PLUS (high strength)', model: modelRef }
	};
	wf['18'] = {
		class_type: 'IPAdapterAdvanced',
		inputs: {
			model: ['17', 0],
			ipadapter: ['17', 1],
			image: ['16', 0],
			weight: params.ipaWeight,
			weight_type: 'linear',
			combine_embeds: 'concat',
			start_at: 0,
			end_at: 1.0,
			embeds_scaling: 'V only'
		}
	};
	wf['3'] = {
		class_type: 'KSampler',
		inputs: {
			seed: params.seed, steps: params.steps, cfg: params.cfg,
			sampler_name: params.sampler, scheduler: params.scheduler,
			denoise: params.denoise,
			model: ['18', 0], positive: ['6', 0], negative: ['7', 0],
			latent_image: ['15', 0]
		}
	};
	wf['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } };
	wf['9'] = { class_type: 'SaveImage', inputs: { filename_prefix: 'gh_sdxl_swap', images: ['8', 0] } };
	return wf;
}

export async function inpaintWithIPACharacter(req: SdxlInpaintIPARequest): Promise<SdxlResult> {
	const base = podUrl();
	const start = Date.now();
	const ipaOk = await isIPAdapterAvailable();
	if (!ipaOk) throw new Error('IP-Adapter not available on pod; cannot run 2-pass swap');
	const lightningLora = process.env.SDXL_LIGHTNING_LORA || '';
	const useLightning = !!lightningLora && (await isLightningAvailable(lightningLora));

	const [uInit, uMask, uRef] = await Promise.all([
		uploadImage(req.initImage, `gh_swap_init_${Date.now()}.png`),
		uploadImage(req.maskImage, `gh_swap_mask_${Date.now()}.png`),
		uploadImage(req.characterRefImage, `gh_swap_ref_${Date.now()}.png`)
	]);

	const params = {
		initName: uInit.name,
		maskName: uMask.name,
		refName: uRef.name,
		positive: req.positive,
		negative: req.negative || 'low quality, worst quality, blurry, deformed, extra fingers, bad anatomy, watermark',
		checkpoint: req.checkpoint || defaultCheckpoint(),
		denoise: Math.min(0.85, Math.max(0.4, req.denoise ?? 0.65)),
		steps: useLightning ? 8 : 22,
		cfg: useLightning ? 2.5 : 5,
		sampler: useLightning ? 'euler' : 'euler_ancestral',
		scheduler: useLightning ? 'sgm_uniform' : 'normal',
		seed: req.seed ?? Math.floor(Math.random() * 0xffffffff),
		ipaWeight: req.ipaWeight ?? 0.65,
		lightningLora: useLightning ? lightningLora : undefined
	};

	const submitRes = await fetch(`${base}/prompt`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt: buildInpaintIPAWorkflow(params), client_id: randomUUID() })
	});
	if (!submitRes.ok) throw new Error(`ComfyUI /prompt HTTP ${submitRes.status}: ${(await submitRes.text()).slice(0, 400)}`);
	const { prompt_id: promptId } = (await submitRes.json()) as { prompt_id: string };
	const history = await pollHistory(promptId, 180_000);
	const outputs = history.outputs ?? {};
	let imageMeta: { filename: string; subfolder: string; type: string } | undefined;
	for (const node of Object.values<any>(outputs)) {
		if (Array.isArray(node?.images) && node.images.length) { imageMeta = node.images[0]; break; }
	}
	if (!imageMeta) throw new Error('ComfyUI produced no image (inpaint)');
	const params2 = new URLSearchParams({
		filename: imageMeta.filename,
		subfolder: imageMeta.subfolder ?? '',
		type: imageMeta.type ?? 'output'
	});
	const imgRes = await fetch(`${base}/view?${params2.toString()}`);
	if (!imgRes.ok) throw new Error(`ComfyUI /view HTTP ${imgRes.status}`);
	const bytes = Buffer.from(await imgRes.arrayBuffer());
	return { bytes, filename: imageMeta.filename, seed: params.seed, promptId, durationMs: Date.now() - start };
}

export async function generateSdxlImg2Img(req: SdxlImg2ImgRequest): Promise<SdxlResult> {
	const base = podUrl();
	const start = Date.now();
	const uploaded = await uploadImage(req.initImage);
	const lightningLora = process.env.SDXL_LIGHTNING_LORA || '';
	const scribbleCn = process.env.SDXL_SCRIBBLE_CONTROLNET || '';
	const useLightning = !req.disableLightning && !!lightningLora && (await isLightningAvailable(lightningLora));
	const useScribble = !!req.scribbleImage && !!scribbleCn && (await isScribbleAvailable(scribbleCn));
	const ckptCfg = getCheckpointConfig(req.checkpoint || defaultCheckpoint());

	let scribbleUploadedName: string | undefined;
	if (useScribble && req.scribbleImage) {
		const uploadedScribble = await uploadImage(req.scribbleImage, `gh_scribble_${Date.now()}.png`);
		scribbleUploadedName = uploadedScribble.name;
	}

	const refImagesIn: Buffer[] = [];
	if (req.faceReferenceImages && req.faceReferenceImages.length) refImagesIn.push(...req.faceReferenceImages);
	else if (req.faceReferenceImage) refImagesIn.push(req.faceReferenceImage);
	let faceReferenceUploadedNames: string[] | undefined;
	const useFaceIPA = refImagesIn.length > 0 && (await isIPAdapterAvailable());
	if (useFaceIPA) {
		faceReferenceUploadedNames = await Promise.all(
			refImagesIn.map((buf, i) => uploadImage(buf, `gh_face_${Date.now()}_${i}.png`).then((r) => r.name))
		);
	}

	// When ControlNet conditions composition, we want the AI to commit fully,
	// so push denoise high (>=0.85) regardless of AI Strength (which becomes scribble strength).
	const baseDenoise = Math.min(0.95, Math.max(0.1, req.denoise ?? 0.6));
	const effectiveDenoise = useScribble ? Math.max(0.85, baseDenoise) : baseDenoise;

	const filled = {
		positive: req.positive,
		negative: req.negative || 'low quality, worst quality, blurry, deformed, extra fingers, bad anatomy, watermark',
		checkpoint: req.checkpoint || defaultCheckpoint(),
		width: req.width ?? 1024,
		height: req.height ?? 1024,
		steps: req.steps ?? (useLightning ? (useScribble ? 10 : 6) : (useScribble ? ckptCfg.steps + 1 : ckptCfg.steps)),
		cfg: req.cfg ?? (useLightning ? (useScribble ? 4 : 1.5) : ckptCfg.cfg),
		sampler: req.sampler ?? (useLightning ? 'euler' : ckptCfg.sampler),
		scheduler: req.scheduler ?? (useLightning ? 'sgm_uniform' : ckptCfg.scheduler),
		denoise: effectiveDenoise,
		seed: req.seed ?? Math.floor(Math.random() * 0xffffffff),
		lightningLora: useLightning ? lightningLora : undefined,
		scribbleControlnet: useScribble ? scribbleCn : undefined,
		scribbleUploadedName,
		// AI Strength inverts to scribble adherence: high AI Strength = looser sketch following
		scribbleStrength: req.scribbleStrength ?? Math.min(0.95, Math.max(0.4, 1.0 - (baseDenoise - 0.5) * 0.6)),
		faceReferenceUploadedNames,
		faceReferenceWeight: req.faceReferenceWeight,
		preprocessScribble: req.preprocessScribble ?? 'scribble',
		isVpred: ckptCfg.isVpred
	};
	const clientId = randomUUID();
	const submitRes = await fetch(`${base}/prompt`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt: buildImg2ImgWorkflow(uploaded.name, filled), client_id: clientId })
	});
	if (!submitRes.ok) throw new Error(`ComfyUI /prompt HTTP ${submitRes.status}: ${(await submitRes.text()).slice(0, 400)}`);
	const { prompt_id: promptId } = (await submitRes.json()) as { prompt_id: string };
	if (!promptId) throw new Error('No prompt_id returned by ComfyUI');
	const history = await pollHistory(promptId, 180_000);
	const outputs = history.outputs ?? {};
	let imageMeta: { filename: string; subfolder: string; type: string } | undefined;
	for (const node of Object.values<any>(outputs)) {
		if (Array.isArray(node?.images) && node.images.length) { imageMeta = node.images[0]; break; }
	}
	if (!imageMeta) throw new Error('ComfyUI produced no image');
	const params = new URLSearchParams({
		filename: imageMeta.filename,
		subfolder: imageMeta.subfolder ?? '',
		type: imageMeta.type ?? 'output'
	});
	const imgRes = await fetch(`${base}/view?${params.toString()}`);
	if (!imgRes.ok) throw new Error(`ComfyUI /view HTTP ${imgRes.status}`);
	const bytes = Buffer.from(await imgRes.arrayBuffer());
	return { bytes, filename: imageMeta.filename, seed: filled.seed, promptId, durationMs: Date.now() - start };
}

export async function generateSdxl(req: SdxlRequest): Promise<SdxlResult> {
	const base = podUrl();
	const start = Date.now();
	const filled = {
		positive: req.positive,
		negative: req.negative || 'low quality, worst quality, blurry, deformed, extra fingers, bad anatomy, watermark',
		checkpoint: req.checkpoint || defaultCheckpoint(),
		width: req.width ?? 1024,
		height: req.height ?? 1024,
		steps: req.steps ?? 28,
		cfg: req.cfg ?? 6,
		sampler: req.sampler ?? 'euler_ancestral',
		scheduler: req.scheduler ?? 'normal',
		seed: req.seed ?? Math.floor(Math.random() * 0xffffffff)
	};
	const clientId = randomUUID();
	const submitRes = await fetch(`${base}/prompt`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prompt: buildWorkflow(filled), client_id: clientId })
	});
	if (!submitRes.ok) {
		throw new Error(`ComfyUI /prompt HTTP ${submitRes.status}: ${(await submitRes.text()).slice(0, 400)}`);
	}
	const { prompt_id: promptId } = (await submitRes.json()) as { prompt_id: string };
	if (!promptId) throw new Error('No prompt_id returned by ComfyUI');

	const history = await pollHistory(promptId, 180_000);
	const outputs = history.outputs ?? {};
	let imageMeta: { filename: string; subfolder: string; type: string } | undefined;
	for (const node of Object.values<any>(outputs)) {
		if (Array.isArray(node?.images) && node.images.length) {
			imageMeta = node.images[0];
			break;
		}
	}
	if (!imageMeta) throw new Error('ComfyUI produced no image');

	const params = new URLSearchParams({
		filename: imageMeta.filename,
		subfolder: imageMeta.subfolder ?? '',
		type: imageMeta.type ?? 'output'
	});
	const imgRes = await fetch(`${base}/view?${params.toString()}`);
	if (!imgRes.ok) throw new Error(`ComfyUI /view HTTP ${imgRes.status}`);
	const bytes = Buffer.from(await imgRes.arrayBuffer());
	return { bytes, filename: imageMeta.filename, seed: filled.seed, promptId, durationMs: Date.now() - start };
}
