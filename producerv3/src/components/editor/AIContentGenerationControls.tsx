/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/ai-content-generation-controls
 * 
 * AI Content Generation Controls Component
 * UI for AI content generation with multi-agent support
 */
'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useMutation } from '@apollo/client';
import { extractEditorContext, extractContextAroundCursor } from '@/lib/editor/contextExtractor';
import { buildMultiAgentContext } from '@/lib/ai/multiAgentContext';
import { GENERATE_CONTENT_WITH_MULTI_AGENT } from '@/lib/graphql/mutations';

interface AIContentGenerationControlsProps {
  editor: Editor | null;
}

interface EmotionBeat {
  position: number;
  targetEmotions: Record<string, number>;
}

export function AIContentGenerationControls({ editor }: AIContentGenerationControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [characterId, setCharacterId] = useState<string | undefined>();
  const [sceneId, setSceneId] = useState<string | undefined>();
  const [povId, setPovId] = useState<string | undefined>();
  const [emotionArc, setEmotionArc] = useState<EmotionBeat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [generateContent] = useMutation(GENERATE_CONTENT_WITH_MULTI_AGENT);

  if (!editor) {
    return null;
  }

  const handleGenerate = async () => {
    if (!editor || !prompt.trim()) {
      setError('プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Extract context from editor
      const editorContext = editor.state.selection.empty
        ? extractContextAroundCursor(editor, 200)
        : extractEditorContext(editor);

      // Build multi-agent context
      const multiAgentContext = buildMultiAgentContext(editor, {
        characterIds: characterId ? [characterId] : undefined,
        sceneId,
        povId,
      });

      // Build context string
      const contextParts: string[] = [];

      if (multiAgentContext.scene) {
        contextParts.push(`Scene: ${multiAgentContext.scene.name}`);
        contextParts.push(
          `Characters present: ${multiAgentContext.scene.characters.map((c) => c.name).join(', ')}`
        );
      }

      if (multiAgentContext.characters.length > 0) {
        multiAgentContext.characters.forEach((char) => {
          contextParts.push(`Character: ${char.name}`);
          if (char.dialogue.length > 0) {
            contextParts.push(`Previous dialogue: ${char.dialogue.slice(-3).join(' ')}`);
          }
          if (char.attributes.description) {
            contextParts.push(`Description: ${char.attributes.description}`);
          }
        });
      }

      if (multiAgentContext.narrator) {
        contextParts.push(`Narrator: ${multiAgentContext.narrator.name}`);
        if (multiAgentContext.narrator.perspectiveType) {
          contextParts.push(`Perspective: ${multiAgentContext.narrator.perspectiveType}`);
        }
      }

      if (editorContext.selectedText) {
        contextParts.push(`Selected text: ${editorContext.selectedText.substring(0, 500)}`);
      }

      const context = contextParts.join('\n');

      // Prepare emotion arc
      const emotionArcInput = emotionArc.length > 0
        ? emotionArc.map((beat) => ({
            position: beat.position,
            targetEmotions: beat.targetEmotions,
          }))
        : undefined;

      // Call GraphQL mutation
      const { data } = await generateContent({
        variables: {
          input: {
            characterId: characterId || null,
            sceneId: sceneId || null,
            povId: povId || null,
            context: context || null,
            emotionArc: emotionArcInput || null,
            prompt,
            maxLength: 1000,
            temperature: 0.7,
          },
        },
      });

      if (data?.generateContentWithMultiAgent?.text) {
        // Insert generated content
        editor.chain().focus().insertContent(data.generateContentWithMultiAgent.text).run();
        setShowDialog(false);
        setPrompt('');
      } else {
        setError('生成に失敗しました');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPrompt('');
    setError(null);
    setEmotionArc([]);
  };

  const addEmotionBeat = () => {
    setEmotionArc([
      ...emotionArc,
      {
        position: emotionArc.length + 1,
        targetEmotions: {},
      },
    ]);
  };

  const removeEmotionBeat = (index: number) => {
    setEmotionArc(emotionArc.filter((_, i) => i !== index));
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-medium"
        title="AI生成"
      >
        ✨ AI生成
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">AIコンテンツ生成</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">プロンプト</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder="生成したい内容を入力してください"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">キャラクターID（オプション）</label>
                  <input
                    type="text"
                    value={characterId || ''}
                    onChange={(e) => setCharacterId(e.target.value || undefined)}
                    className="w-full p-2 border rounded"
                    placeholder="character:id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">シーンID（オプション）</label>
                  <input
                    type="text"
                    value={sceneId || ''}
                    onChange={(e) => setSceneId(e.target.value || undefined)}
                    className="w-full p-2 border rounded"
                    placeholder="scene:id"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">POV ID（オプション）</label>
                <input
                  type="text"
                  value={povId || ''}
                  onChange={(e) => setPovId(e.target.value || undefined)}
                  className="w-full p-2 border rounded"
                  placeholder="pov:id"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">感情アーク（オプション）</label>
                  <button
                    onClick={addEmotionBeat}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    + ビート追加
                  </button>
                </div>
                {emotionArc.map((beat, index) => (
                  <div key={index} className="mb-2 p-2 border rounded flex items-center gap-2">
                    <span className="text-sm">ビート {beat.position}</span>
                    <input
                      type="text"
                      placeholder="感情: スコア (例: joy: 0.8)"
                      className="flex-1 p-1 border rounded text-sm"
                      onChange={(e) => {
                        const newArc = [...emotionArc];
                        // Parse emotion:score format
                        const parts = e.target.value.split(':');
                        if (parts.length === 2) {
                          const emotion = parts[0].trim();
                          const score = parseFloat(parts[1].trim());
                          if (!isNaN(score)) {
                            newArc[index].targetEmotions[emotion] = score;
                            setEmotionArc(newArc);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => removeEmotionBeat(index)}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isGenerating}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

