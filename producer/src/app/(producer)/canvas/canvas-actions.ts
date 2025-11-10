'use server';

import { writeJsonLd, readJsonLd } from '@/server/lib/jsonld-storage';
import { canvasToJsonLd, jsonLdToCanvas, type CanvasJsonLd } from '@/lib/canvas-jsonld';
import type { Node as RFNode, Edge as RFEdge } from '@reactflow/core';
import type { NodeData } from '@/pipeline/node-types';

/**
 * Canvas を JSON-LD ファイルに保存する Server Action
 * 
 * @param nodes - React Flow ノード配列
 * @param edges - React Flow エッジ配列
 * @param filename - ファイル名（デフォルト: 'canvas.jsonld'）
 * @returns 保存結果
 */
export async function saveCanvasToJsonLdAction(
  nodes: RFNode<NodeData>[],
  edges: RFEdge[],
  filename: string = 'canvas.jsonld'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const jsonLd = canvasToJsonLd(nodes, edges);
    // ファイル名から拡張子を除去（writeJsonLdが自動的に追加する）
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    writeJsonLd('canvas', nameWithoutExt, jsonLd);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save canvas JSON-LD:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * JSON-LD ファイルから Canvas を読み込む Server Action
 * 
 * @param filename - ファイル名（デフォルト: 'canvas.jsonld'）
 * @returns Canvas データまたは null
 */
export async function loadCanvasFromJsonLdAction(
  filename: string = 'canvas.jsonld'
): Promise<{ ok: true; data: { nodes: RFNode<NodeData>[]; edges: RFEdge[] } } | { ok: false; error: string }> {
  try {
    // ファイル名から拡張子を除去（readJsonLdが自動的に追加する）
    const nameWithoutExt = filename.replace(/\.jsonld$/, '');
    const jsonLd = readJsonLd<CanvasJsonLd>('canvas', nameWithoutExt);
    if (!jsonLd) {
      return { ok: false, error: 'Canvas file not found' };
    }
    const canvas = jsonLdToCanvas(jsonLd);
    return { ok: true, data: canvas };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load canvas JSON-LD:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

