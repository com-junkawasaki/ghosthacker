/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tiptap-extension-types
 * 
 * Tiptap拡張用の共通型定義
 */
import type { Commands } from '@tiptap/core';

export type ParseHTMLFunction = (element: HTMLElement) => string | null | undefined;
export type RenderHTMLFunction = (attributes: Record<string, unknown>) => Record<string, unknown> | {};

export interface CommandProps {
  commands: Commands;
}

export interface RenderHTMLProps {
  HTMLAttributes: Record<string, unknown>;
}

