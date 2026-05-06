/**
 * ComfyUI HTTP client. Submits a text2img workflow, polls until complete,
 * and returns the resulting PNG bytes.
 */
import { randomUUID } from 'node:crypto';

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

function buildImg2ImgWorkflow(uploadedName: string, req: Required<Omit<SdxlImg2ImgRequest, 'seed' | 'initImage'>> & { seed: number }): Record<string, unknown> {
	return {
		'4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: req.checkpoint } },
		'10': { class_type: 'LoadImage', inputs: { image: uploadedName } },
		'11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
		'6': { class_type: 'CLIPTextEncode', inputs: { text: req.positive, clip: ['4', 1] } },
		'7': { class_type: 'CLIPTextEncode', inputs: { text: req.negative, clip: ['4', 1] } },
		'3': {
			class_type: 'KSampler',
			inputs: {
				seed: req.seed, steps: req.steps, cfg: req.cfg,
				sampler_name: req.sampler, scheduler: req.scheduler,
				denoise: req.denoise,
				model: ['4', 0], positive: ['6', 0], negative: ['7', 0],
				latent_image: ['11', 0]
			}
		},
		'8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
		'9': { class_type: 'SaveImage', inputs: { filename_prefix: 'gh_sdxl_i2i', images: ['8', 0] } }
	};
}

export async function generateSdxlImg2Img(req: SdxlImg2ImgRequest): Promise<SdxlResult> {
	const base = podUrl();
	const start = Date.now();
	const uploaded = await uploadImage(req.initImage);
	const filled = {
		positive: req.positive,
		negative: req.negative || 'low quality, worst quality, blurry, deformed, extra fingers, bad anatomy, watermark',
		checkpoint: req.checkpoint || defaultCheckpoint(),
		width: req.width ?? 1024,
		height: req.height ?? 1024,
		steps: req.steps ?? 20,
		cfg: req.cfg ?? 6,
		sampler: req.sampler ?? 'euler_ancestral',
		scheduler: req.scheduler ?? 'normal',
		denoise: Math.min(0.95, Math.max(0.1, req.denoise ?? 0.6)),
		seed: req.seed ?? Math.floor(Math.random() * 0xffffffff)
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
