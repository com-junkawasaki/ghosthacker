/**
 * Adapters for cloud image-generation engines (non-ComfyUI).
 * Currently: OpenAI gpt-image-1.
 */

export interface ExternalImageRequest {
	prompt: string;
	negative?: string;
	size?: '1024x1024' | '1024x1536' | '1536x1024';
	seed?: number;
	model?: string;
}

export interface ExternalImageResult {
	bytes: Buffer;
	durationMs: number;
}

const OPENAI_API_KEY = () => process.env.OPENAI_API_KEY || '';

/**
 * OpenAI gpt-image-1: image generation via /v1/images/generations.
 * Returns base64 PNG.
 */
async function callOpenAIGen(model: string, prompt: string, size: string, key: string): Promise<{ ok: true; b64: string } | { ok: false; status: number; error: string }> {
	const res = await fetch('https://api.openai.com/v1/images/generations', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
		body: JSON.stringify({ model, prompt, size, n: 1 })
	});
	const text = await res.text();
	if (!res.ok) return { ok: false, status: res.status, error: text.slice(0, 400) };
	const json = JSON.parse(text);
	const b64 = json.data?.[0]?.b64_json;
	if (!b64) return { ok: false, status: 200, error: 'no image in response' };
	return { ok: true, b64 };
}

export async function generateOpenAIImage(req: ExternalImageRequest): Promise<ExternalImageResult> {
	const key = OPENAI_API_KEY();
	if (!key) throw new Error('OPENAI_API_KEY not set');
	const start = Date.now();
	const size = req.size ?? '1024x1024';
	const requested = req.model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

	// Try the requested model; if 403 (org-verification needed), fall back to gpt-image-1.
	let r = await callOpenAIGen(requested, req.prompt, size, key);
	if (!r.ok && r.status === 403 && requested !== 'gpt-image-1') {
		console.warn(`[openai] ${requested} unavailable (403). Falling back to gpt-image-1.`);
		r = await callOpenAIGen('gpt-image-1', req.prompt, size, key);
	}
	if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${r.error}`);
	return { bytes: Buffer.from(r.b64, 'base64'), durationMs: Date.now() - start };
}

export function isExternalEngine(name: string): boolean {
	return name.includes('/');
}

export interface ExternalImageEditRequest {
	image: Buffer;
	prompt: string;
	mask?: Buffer;
	size?: '1024x1024' | '1024x1536' | '1536x1024';
	model?: string;
}

async function callOpenAIEdit(model: string, image: Buffer, prompt: string, size: string, key: string, mask?: Buffer): Promise<{ ok: true; b64: string } | { ok: false; status: number; error: string }> {
	const form = new FormData();
	form.append('model', model);
	form.append('prompt', prompt);
	form.append('size', size);
	form.append('n', '1');
	form.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'image.png');
	if (mask) form.append('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png');
	const res = await fetch('https://api.openai.com/v1/images/edits', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}` },
		body: form
	});
	const text = await res.text();
	if (!res.ok) return { ok: false, status: res.status, error: text.slice(0, 400) };
	const json = JSON.parse(text);
	const b64 = json.data?.[0]?.b64_json;
	if (!b64) return { ok: false, status: 200, error: 'no image in response' };
	return { ok: true, b64 };
}

export async function editOpenAIImage(req: ExternalImageEditRequest): Promise<ExternalImageResult> {
	const key = OPENAI_API_KEY();
	if (!key) throw new Error('OPENAI_API_KEY not set');
	const start = Date.now();
	const size = req.size ?? '1024x1024';
	const requested = req.model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

	let r = await callOpenAIEdit(requested, req.image, req.prompt, size, key, req.mask);
	if (!r.ok && r.status === 403 && requested !== 'gpt-image-1') {
		console.warn(`[openai] ${requested} unavailable for edits (403). Falling back to gpt-image-1.`);
		r = await callOpenAIEdit('gpt-image-1', req.image, req.prompt, size, key, req.mask);
	}
	if (!r.ok) throw new Error(`OpenAI edit HTTP ${r.status}: ${r.error}`);
	return { bytes: Buffer.from(r.b64, 'base64'), durationMs: Date.now() - start };
}
