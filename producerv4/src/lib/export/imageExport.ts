/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/image-export
 * 
 * Image export utilities
 */
import type { Stage as KonvaStageType } from 'konva';

export async function exportStageAsPNG(stage: KonvaStageType, filename: string = 'manga-page.png', pixelRatio: number = 2): Promise<void> {
  const dataURL = stage.toDataURL({ pixelRatio });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportStageAsJPEG(
  stage: KonvaStageType,
  filename: string = 'manga-page.jpg',
  quality: number = 0.9,
  pixelRatio: number = 2
): Promise<void> {
  const dataURL = stage.toDataURL({
    mimeType: 'image/jpeg',
    quality,
    pixelRatio,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportStageAsPDF(
  stage: KonvaStageType,
  filename: string = 'manga-page.pdf',
  resolution: number = 300
): Promise<void> {
  // PDF export requires jsPDF library
  // For now, we'll export as high-resolution PNG
  // Full PDF export can be implemented later with jsPDF
  const pixelRatio = resolution / 96; // Convert DPI to pixel ratio
  await exportStageAsPNG(stage, filename.replace('.pdf', '.png'), pixelRatio);
}

export function exportStageAsJSON(stage: KonvaStageType): Record<string, unknown> {
  return stage.toJSON();
}

export async function loadStageFromJSON(stage: KonvaStageType, json: Record<string, unknown>): Promise<void> {
  if (typeof window === 'undefined') return;
  stage.destroy();
  const KonvaModule = await import('konva');
  const Konva = KonvaModule.default;
  const newStage = Konva.Stage.create(json);
  Object.assign(stage, newStage);
}

