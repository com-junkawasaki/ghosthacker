/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/analyze-node-content
 * 
 * Content Analyzer Utilities
 * Analyze node content and apply detected nodes, masks, and emotions
 */
import type { Editor } from '@tiptap/react';
import type { MarkType } from '@/types/jsonld';
import { EmotionProfile } from '@/types/jsonld';

export interface DetectedNode {
  text: string;
  nodeType: string;
  confidence: number;
  position?: {
    start: number;
    end: number;
  };
}

export interface RecommendedMask {
  maskType: string;
  confidence: number;
}

export interface AnalyzeNodeContentResult {
  detectedNodes: DetectedNode[];
  recommendedMasks: RecommendedMask[];
  emotionProfile?: EmotionProfile;
}

/**
 * Analyze node content using GraphQL mutation
 */
export async function analyzeNodeContent(
  editor: Editor,
  nodeType: string,
  contentText: string,
  nodeId?: string,
  context?: string
): Promise<AnalyzeNodeContentResult | null> {
  // This will be called from the component that has access to the mutation
  // For now, return null as placeholder
  // The actual implementation will be in NodeClassificationDialog
  return null;
}

/**
 * Apply detected nodes to the editor
 */
export function applyDetectedNodes(
  editor: Editor,
  detectedNodes: DetectedNode[],
  basePosition: { from: number; to: number }
): void {
  if (!editor || detectedNodes.length === 0) {
    return;
  }

  // Sort by position (start) descending to apply from end to start
  const sortedNodes = [...detectedNodes].sort((a, b) => {
    const aStart = a.position?.start ?? 0;
    const bStart = b.position?.start ?? 0;
    return bStart - aStart;
  });

  for (const detectedNode of sortedNodes) {
    if (!detectedNode.position) {
      continue;
    }

    // Calculate absolute positions relative to base position
    const absoluteStart = basePosition.from + detectedNode.position.start;
    const absoluteEnd = basePosition.from + detectedNode.position.end;

    // Map node type to Tiptap command
    const typeCommandMap: Record<string, string> = {
      character: 'insertCharacter',
      location: 'insertLocation',
      scene: 'insertScene',
      technology: 'insertTechnology',
      organization: 'insertOrganization',
      ghost: 'insertGhost',
      episode: 'insertEpisode',
      arc: 'insertArc',
      motif: 'insertMotif',
      event: 'insertEvent',
    };

    const command = typeCommandMap[detectedNode.nodeType];
    if (!command) {
      continue;
    }

    // Select the text range and insert node
    editor
      .chain()
      .focus()
      .setTextSelection({ from: absoluteStart, to: absoluteEnd })
      .run();

    // Insert node at selection - type-safe dynamic access to TipTap chain commands
    // TipTap chain API returns an object with dynamically added methods from extensions
    type ChainCommand = (args: Record<string, unknown>) => { run: () => void };
    const chainFocus = editor.chain().focus() as Record<string, unknown>;
    const insertCommand = chainFocus[command];
    
    // Type guard: check if insertCommand is a function
    if (typeof insertCommand === 'function') {
      (insertCommand as ChainCommand)({
        name: detectedNode.text.substring(0, 50), // Use first 50 chars as name
      }).run();
    }
  }
}

/**
 * Apply recommended masks to the editor
 */
export function applyRecommendedMasks(
  editor: Editor,
  recommendedMasks: RecommendedMask[],
  position: { from: number; to: number }
): void {
  if (!editor || recommendedMasks.length === 0) {
    return;
  }

  // Filter masks with confidence > 0.7
  const highConfidenceMasks = recommendedMasks.filter((mask) => mask.confidence > 0.7);

  if (highConfidenceMasks.length === 0) {
    return;
  }

  // Set selection
  editor.chain().focus().setTextSelection(position).run();

  // Apply each mask
  for (const mask of highConfidenceMasks) {
    editor.chain().focus().setMark(mask.maskType as MarkType['type'], true).run();
  }
}

/**
 * Apply emotion analysis results to the editor
 */
export function applyEmotionAnalysis(
  editor: Editor,
  emotionProfile: EmotionProfile,
  position: { from: number; to: number }
): void {
  if (!editor || !emotionProfile) {
    return;
  }

  // Set emotion profile on the node at position
  editor.chain().focus().setTextSelection(position).run();
  
  // Set emotion profile using EmotionAnalysisExtension command
  editor.chain().focus().setEmotionProfile(emotionProfile).run();
}

