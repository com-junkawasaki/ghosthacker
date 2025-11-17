/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-analysis-controls
 * 
 * Emotion Analysis Controls UI Component
 */
'use client';

import { useState } from 'react';
import { useEditor } from '@tiptap/react';
import { useMutation } from '@apollo/client';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ANALYZE_EMOTIONS } from '@/lib/graphql/mutations';
import { EmotionProfile, EmotionScore } from '@/types/jsonld';
import { MaskType } from '@/types/jsonld';

export function EmotionAnalysisControls() {
  const editor = useEditor();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<EmotionProfile | null>(null);
  const [analyzeEmotions] = useMutation(ANALYZE_EMOTIONS);

  if (!editor) {
    return null;
  }

  const handleAnalyze = async () => {
    const { selection } = editor.state;
    const { from, to } = selection;
    
    // Get selected text or current paragraph
    const selectedText = editor.state.doc.textBetween(from, to);
    const paragraph = editor.state.doc.nodeAt(from);
    
    if (!selectedText && !paragraph) {
      return;
    }

    const textToAnalyze = selectedText || paragraph?.textContent || '';
    if (!textToAnalyze.trim()) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data } = await analyzeEmotions({
        variables: {
          input: {
            text: textToAnalyze,
            language: 'ja',
            maxSentences: 200,
          },
        },
      });

      if (data?.analyzeEmotions) {
        const profile: EmotionProfile = {
          emotionVector: data.analyzeEmotions.emotionVector.map((ev: any) => ({
            emotion: ev.emotion,
            score: ev.score,
          })),
          createdAt: data.analyzeEmotions.createdAt,
          language: data.analyzeEmotions.language,
        };

        // Set emotion profile on paragraph
        editor.chain().focus().setEmotionProfile(profile).run();
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error('Failed to analyze emotions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleEmotionMask = () => {
    editor.chain().focus().toggleMask('emotion' as MaskType['type']).run();
  };

  const handleClearEmotions = () => {
    editor.chain().focus().clearEmotionProfile().run();
    setCurrentProfile(null);
  };

  // Get current paragraph's emotion profile
  const getCurrentParagraphEmotions = (): EmotionScore[] | null => {
    if (!editor) return null;
    
    const { selection } = editor.state;
    const { from } = selection;
    
    // Find paragraph node at selection
    let paragraph: ProseMirrorNode | null = null;
    editor.state.doc.nodesBetween(from, from, (node) => {
      if (node.type.name === 'paragraph') {
        paragraph = node;
      }
    });
    
    if (paragraph) {
      // Type assertion to ensure attrs exists
      const nodeWithAttrs = paragraph as ProseMirrorNode & { attrs: Record<string, unknown> };
      const attrs = nodeWithAttrs.attrs;
      const vector = attrs.emotionVector as EmotionScore[] | null | undefined;
      return vector || null;
    }
    
    return null;
  };

  const currentEmotions = getCurrentParagraphEmotions();

  return (
    <div className="emotion-analysis-controls p-2 border-t border-gray-300 dark:border-gray-600">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold">Emotion Analysis:</span>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`px-3 py-1 text-sm rounded ${
            isAnalyzing
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Emotions'}
        </button>
        <button
          onClick={handleToggleEmotionMask}
          className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Toggle Mask
        </button>
        {currentEmotions && (
          <button
            onClick={handleClearEmotions}
            className="px-3 py-1 text-sm rounded bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-700"
          >
            Clear
          </button>
        )}
      </div>
      
      {currentEmotions && currentEmotions.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-xs font-semibold mb-1">Current Emotions:</div>
          <div className="flex flex-wrap gap-1">
            {currentEmotions.slice(0, 5).map((emotion, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                title={`Score: ${emotion.score.toFixed(3)}`}
              >
                {emotion.emotion}: {(emotion.score * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

