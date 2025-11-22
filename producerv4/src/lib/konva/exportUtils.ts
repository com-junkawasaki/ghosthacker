/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/konva-export-utils
 * 
 * Konva export utilities
 */
import type { Stage as KonvaStageType } from 'konva';

export async function exportStageAsPNG(stage: KonvaStageType, filename: string = 'manga-page.png'): Promise<void> {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

export async function exportStageAsJPEG(stage: KonvaStageType, filename: string = 'manga-page.jpg', quality: number = 0.9): Promise<void> {
  const dataURL = stage.toDataURL({ 
    mimeType: 'image/jpeg',
    quality,
    pixelRatio: 2,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
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

