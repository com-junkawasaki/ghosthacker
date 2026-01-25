/**
 * Image Export Utility for Manga Editor
 * Exports Konva Stage to PNG, JPEG, or PDF
 */

import type Konva from 'konva';

/**
 * Export Konva Stage as PNG
 */
export async function exportAsPNG(
	stage: Konva.Stage,
	options?: {
		pixelRatio?: number;
		mimeType?: string;
		quality?: number;
	}
): Promise<Blob> {
	const pixelRatio = options?.pixelRatio || 2;
	const mimeType = options?.mimeType || 'image/png';
	const quality = options?.quality || 1;

	const dataURL = stage.toDataURL({
		pixelRatio,
		mimeType,
		quality,
	});

	// Convert data URL to Blob
	const response = await fetch(dataURL);
	return await response.blob();
}

/**
 * Export Konva Stage as JPEG
 */
export async function exportAsJPEG(
	stage: Konva.Stage,
	options?: {
		pixelRatio?: number;
		quality?: number;
	}
): Promise<Blob> {
	return exportAsPNG(stage, {
		...options,
		mimeType: 'image/jpeg',
		quality: options?.quality || 0.9,
	});
}

/**
 * Export Konva Stage as PDF
 * Note: This is a basic implementation. For production, consider using jsPDF or similar library
 */
export async function exportAsPDF(
	stage: Konva.Stage,
	options?: {
		pixelRatio?: number;
		filename?: string;
	}
): Promise<Blob> {
	// For now, export as PNG and let the browser handle PDF conversion
	// In production, you would use jsPDF or similar library
	const pngBlob = await exportAsPNG(stage, {
		pixelRatio: options?.pixelRatio || 2,
		mimeType: 'image/png',
	});

	// TODO: Implement proper PDF generation using jsPDF
	// For now, return PNG blob
	return pngBlob;
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
