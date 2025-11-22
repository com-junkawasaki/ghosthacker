/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/konva-export-utils
 * 
 * Konva export utilities
 */
import { Stage } from 'konva';

export async function exportStageAsPNG(stage: Stage, filename: string = 'manga-page.png'): Promise<void> {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

export async function exportStageAsJPEG(stage: Stage, filename: string = 'manga-page.jpg', quality: number = 0.9): Promise<void> {
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

export function exportStageAsJSON(stage: Stage): Record<string, unknown> {
  return stage.toJSON();
}

export function loadStageFromJSON(stage: Stage, json: Record<string, unknown>): void {
  stage.destroy();
  const newStage = Stage.create(json);
  Object.assign(stage, newStage);
}

