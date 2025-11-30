/**
 * Story Element Editor Component
 * ストーリー要素の詳細編集フォーム（サイドパネル用）
 */

import { useState, useEffect } from 'react';
import { GraphNodeData, StoryElementNodeType, StoryElementProperties } from './types';

interface StoryElementEditorProps {
  node: { id: string; data: GraphNodeData } | null;
  onSave: (id: string, data: Partial<GraphNodeData>) => Promise<void>;
  onClose: () => void;
}

const ELEMENT_TYPE_LABELS: Record<StoryElementNodeType, string> = {
  worldview: '世界観',
  background: '背景',
  timeline: '時間軸',
  beat: 'ビート',
  character: 'キャラクター',
  scene: 'シーン',
  event: 'イベント',
  context: 'コンテキスト',
  process: 'プロセス',
};

export default function StoryElementEditor({ node, onSave, onClose }: StoryElementEditorProps) {
  const [formData, setFormData] = useState<Partial<GraphNodeData>>({});
  const [properties, setProperties] = useState<StoryElementProperties>({});
  const [jsonld, setJsonld] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setFormData(node.data);
      setProperties(node.data.properties || {});
      setJsonld(node.data.jsonld || {});
    }
  }, [node]);

  if (!node) return null;

  const nodeType = node.data.nodeType || 'character';
  const isContext = node.data.isContext || false;

  const handlePropertyChange = (key: string, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleJsonldChange = (jsonldString: string) => {
    try {
      const parsed = JSON.parse(jsonldString);
      setJsonld(parsed);
    } catch (e) {
      // Invalid JSON, keep as string for now
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(node.id, {
        ...formData,
        label: formData.label || node.data.label,
        properties,
        jsonld,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPropertyFields = () => {
    if (isContext) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              バージョン
            </label>
            <input
              type="number"
              value={node.data.contextData?.version || 1}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>
      );
    }

    switch (nodeType) {
      case 'character':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名前
              </label>
              <input
                type="text"
                value={properties.name || ''}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                役割
              </label>
              <input
                type="text"
                value={properties.role || ''}
                onChange={(e) => handlePropertyChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                性格
              </label>
              <textarea
                value={properties.personality || ''}
                onChange={(e) => handlePropertyChange('personality', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                動機
              </label>
              <textarea
                value={properties.motivation || ''}
                onChange={(e) => handlePropertyChange('motivation', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                対立
              </label>
              <textarea
                value={properties.conflict || ''}
                onChange={(e) => handlePropertyChange('conflict', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                声の特徴
              </label>
              <textarea
                value={properties.voice || ''}
                onChange={(e) => handlePropertyChange('voice', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'beat':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                目的
              </label>
              <select
                value={properties.purpose || 'setup'}
                onChange={(e) => handlePropertyChange('purpose', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="setup">セットアップ</option>
                <option value="conflict">対立</option>
                <option value="climax">クライマックス</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                目標語数
              </label>
              <input
                type="number"
                value={properties.targetLength || 0}
                onChange={(e) => handlePropertyChange('targetLength', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                内容
              </label>
              <textarea
                value={properties.content || ''}
                onChange={(e) => handlePropertyChange('content', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'worldview':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                設定
              </label>
              <input
                type="text"
                value={properties.setting || ''}
                onChange={(e) => handlePropertyChange('setting', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                時代
              </label>
              <input
                type="text"
                value={properties.era || ''}
                onChange={(e) => handlePropertyChange('era', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ルール
              </label>
              <textarea
                value={properties.rules || ''}
                onChange={(e) => handlePropertyChange('rules', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                雰囲気
              </label>
              <textarea
                value={properties.atmosphere || ''}
                onChange={(e) => handlePropertyChange('atmosphere', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                開始日
              </label>
              <input
                type="text"
                value={properties.startDate || ''}
                onChange={(e) => handlePropertyChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="例: 2042年1月"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                終了日
              </label>
              <input
                type="text"
                value={properties.endDate || ''}
                onChange={(e) => handlePropertyChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="例: 2042年12月"
              />
            </div>
          </div>
        );

      case 'scene':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                場所
              </label>
              <input
                type="text"
                value={properties.location || ''}
                onChange={(e) => handlePropertyChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                時間
              </label>
              <input
                type="text"
                value={properties.time || ''}
                onChange={(e) => handlePropertyChange('time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                参加者
              </label>
              <input
                type="text"
                value={Array.isArray(properties.participants) ? properties.participants.join(', ') : ''}
                onChange={(e) => handlePropertyChange('participants', e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="カンマ区切り"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                説明
              </label>
              <textarea
                value={properties.description || ''}
                onChange={(e) => handlePropertyChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'event':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                タイプ
              </label>
              <input
                type="text"
                value={properties.type || ''}
                onChange={(e) => handlePropertyChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                説明
              </label>
              <textarea
                value={properties.description || ''}
                onChange={(e) => handlePropertyChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                結果
              </label>
              <textarea
                value={Array.isArray(properties.consequences) ? properties.consequences.join('\n') : ''}
                onChange={(e) => handlePropertyChange('consequences', e.target.value.split('\n').filter(s => s.trim()))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="1行に1つずつ"
              />
            </div>
          </div>
        );

      case 'process':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                生成タイプ
              </label>
              <select
                value={properties.generationType || 'document'}
                onChange={(e) => handlePropertyChange('generationType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="document">文書</option>
                <option value="image">画像</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LLMプロバイダー
              </label>
              <select
                value={properties.llmProvider || 'openai'}
                onChange={(e) => handlePropertyChange('llmProvider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                モデルID
              </label>
              <input
                type="text"
                value={properties.modelId || ''}
                onChange={(e) => handlePropertyChange('modelId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={properties.generationType === 'document' ? 'gpt-4' : 'dall-e-3'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                プロンプトテンプレート
              </label>
              <textarea
                value={properties.promptTemplate || 'Generate content based on:\n\n{{context}}\n\nRelated nodes:\n{{relatedNodes}}'}
                onChange={(e) => handlePropertyChange('promptTemplate', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                placeholder="{{context}} と {{relatedNodes}} が置換されます"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                出力形式
              </label>
              <input
                type="text"
                value={properties.outputFormat || (properties.generationType === 'document' ? 'markdown' : 'png')}
                onChange={(e) => handlePropertyChange('outputFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder={properties.generationType === 'document' ? 'markdown, html' : 'png, jpg'}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={properties.autoExecute || false}
                onChange={(e) => handlePropertyChange('autoExecute', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                自動実行（条件満たした時に自動実行）
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                入力ノードID（カンマ区切り）
              </label>
              <input
                type="text"
                value={Array.isArray(properties.inputNodes) ? properties.inputNodes.join(', ') : ''}
                onChange={(e) => handlePropertyChange('inputNodes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="node-id-1, node-id-2"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isContext ? 'コンテキスト編集' : `${ELEMENT_TYPE_LABELS[nodeType]}編集`}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ラベル
          </label>
          <input
            type="text"
            value={formData.label || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Properties */}
        {renderPropertyFields()}

        {/* JSON-LD Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            JSON-LD
          </label>
          <textarea
            value={JSON.stringify(jsonld, null, 2)}
            onChange={(e) => handleJsonldChange(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

