/**
 * Tiny helpers for generating region masks (PNG, white = inpaint, black = keep)
 * and lightweight face-region cropping of character reference sheets.
 */
import { PNG } from 'pngjs';

/**
 * Crop the top portion of a PNG (where the face/head is on character ref sheets)
 * and resize-by-decimation to a square. Uses nearest-neighbor; quality is fine for IPA.
 */
export function cropFaceRegion(pngBuffer: Buffer, headRatio = 0.42): Buffer {
	const src = PNG.sync.read(pngBuffer);
	const cropH = Math.floor(src.height * headRatio);
	const side = Math.min(src.width, cropH);
	const offsetX = Math.floor((src.width - side) / 2);
	const out = new PNG({ width: side, height: side, colorType: 6 });
	for (let y = 0; y < side; y++) {
		for (let x = 0; x < side; x++) {
			const sIdx = ((y) * src.width + (x + offsetX)) << 2;
			const dIdx = (y * side + x) << 2;
			out.data[dIdx] = src.data[sIdx];
			out.data[dIdx + 1] = src.data[sIdx + 1];
			out.data[dIdx + 2] = src.data[sIdx + 2];
			out.data[dIdx + 3] = 255;
		}
	}
	return PNG.sync.write(out);
}

export interface Region {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Split a [0..1]-normalized canvas into N equal vertical strips.
 * Returns regions in pixel coordinates for the given canvas size.
 */
export function verticalStrips(n: number, canvasW: number, canvasH: number): Region[] {
	if (n <= 0) return [];
	const stripW = Math.floor(canvasW / n);
	return Array.from({ length: n }, (_, i) => ({
		x: i * stripW,
		y: 0,
		width: i === n - 1 ? canvasW - i * stripW : stripW,
		height: canvasH
	}));
}

/**
 * Build a feathered RGB PNG mask: pixels inside `region` are white (255), outside black (0).
 * `feather` extends a soft edge (gradient from white→black) over that many pixels.
 */
export function buildMaskPng(region: Region, canvasW: number, canvasH: number, feather = 32): Buffer {
	const png = new PNG({ width: canvasW, height: canvasH, colorType: 6 });
	const { x, y, width, height } = region;
	const x0 = x, y0 = y, x1 = x + width, y1 = y + height;
	for (let py = 0; py < canvasH; py++) {
		for (let px = 0; px < canvasW; px++) {
			let v = 0;
			const inside = px >= x0 && px < x1 && py >= y0 && py < y1;
			if (inside) {
				if (feather > 0) {
					const d = Math.min(px - x0, x1 - 1 - px, py - y0, y1 - 1 - py);
					v = d >= feather ? 255 : Math.round((d / feather) * 255);
				} else {
					v = 255;
				}
			}
			const idx = (canvasW * py + px) << 2;
			png.data[idx] = v;
			png.data[idx + 1] = v;
			png.data[idx + 2] = v;
			png.data[idx + 3] = 255;
		}
	}
	return PNG.sync.write(png);
}

/**
 * OpenAI image edits use the mask alpha channel: transparent pixels are edited,
 * opaque pixels are preserved. This builds a feathered alpha mask for one region.
 */
export function buildOpenAIAlphaMaskPng(region: Region, canvasW: number, canvasH: number, feather = 32): Buffer {
	const png = new PNG({ width: canvasW, height: canvasH, colorType: 6 });
	const { x, y, width, height } = region;
	const x0 = x, y0 = y, x1 = x + width, y1 = y + height;
	for (let py = 0; py < canvasH; py++) {
		for (let px = 0; px < canvasW; px++) {
			let edit = 0;
			const inside = px >= x0 && px < x1 && py >= y0 && py < y1;
			if (inside) {
				if (feather > 0) {
					const d = Math.min(px - x0, x1 - 1 - px, py - y0, y1 - 1 - py);
					edit = d >= feather ? 255 : Math.round((d / feather) * 255);
				} else {
					edit = 255;
				}
			}
			const idx = (canvasW * py + px) << 2;
			png.data[idx] = 255;
			png.data[idx + 1] = 255;
			png.data[idx + 2] = 255;
			png.data[idx + 3] = 255 - edit;
		}
	}
	return PNG.sync.write(png);
}
