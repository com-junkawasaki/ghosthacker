/**
 * Story Element Editor Component
 * ストーリー要素の詳細編集フォーム（サイドパネル用）
 */

import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, StoryElementNodeType, StoryElementProperties, ContextLayer } from './types';
import { createGraphEdge, deleteGraphEdge } from '@/internal/grpc/services/graph_client';
import { classifyError, formatErrorForDisplay, logError } from '@/utils/errorHandling';

interface StoryElementEditorProps {
  node: { id: string; data: GraphNodeData } | null;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  contextLayers: ContextLayer[];
  onSave: (id: string, data: Partial<GraphNodeData>) => Promise<void>;
  onReload: () => Promise<void>;
  onClose: () => void;
}

const ELEMENT_TYPE_LABELS: Record<StoryElementNodeType, string> = {
  logline: 'ログライン',
  story: 'ストーリー',
  worldview: '世界観',
  background: '背景',
  timeline: '時間軸',
  beat: 'ビート',
  character: 'キャラクター',
  scene: 'シーン',
  cut: 'カット',
  costume: '服装',
  'camera-angle': 'カメラアングル',
  event: 'イベント',
  context: 'コンテキスト',
  process: 'プロセス',
};

export default function StoryElementEditor({ 
  node, 
  nodes, 
  edges, 
  contextLayers, 
  onSave, 
  onReload, 
  onClose 
}: StoryElementEditorProps) {
  const [formData, setFormData] = useState<Partial<GraphNodeData>>({});
  const [properties, setProperties] = useState<StoryElementProperties>({});
  const [jsonld, setJsonld] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setFormData(node.data);
      setProperties(node.data.properties || {});
      setJsonld(node.data.jsonld || {});
      // 現在のコンテクストレイヤーへの所属を取得
      setSelectedLayerIds(node.data.contextIds || (node.data.contextId ? [node.data.contextId] : []));
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

  // コンテクストレイヤーの選択を変更
  const handleLayerToggle = async (layerId: string, checked: boolean) => {
    if (!node) return;

    try {
      if (checked) {
        // レイヤーに追加（エッジを作成）
        const existingEdge = edges.find(
          e => e.source === node.id && 
               e.target === layerId &&
               (e.label === 'usesContext' || e.label === 'belongsTo' || (e.data as any)?.edgeType === 'belongsTo')
        );
        
        if (!existingEdge) {
          await createGraphEdge(node.id, layerId, 'usesContext', { edgeType: 'belongsTo' });
          await onReload();
        }
      } else {
        // レイヤーから削除（エッジを削除）
        const edgeToDelete = edges.find(
          e => e.source === node.id && 
               e.target === layerId &&
               (e.label === 'usesContext' || e.label === 'belongsTo' || (e.data as any)?.edgeType === 'belongsTo')
        );
        
        if (edgeToDelete) {
          await deleteGraphEdge(edgeToDelete.id);
          await onReload();
        }
      }
      
      // 選択状態を更新
      setSelectedLayerIds(prev => 
        checked 
          ? [...prev, layerId]
          : prev.filter(id => id !== layerId)
      );
      setError(null);
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, 'StoryElementEditor.handleLayerToggle');
      setError(formatErrorForDisplay(appError));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(node.id, {
        ...formData,
        label: formData.label || node.data.label,
        properties,
        jsonld,
      });
      onClose();
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, 'StoryElementEditor.handleSave');
      setError(formatErrorForDisplay(appError));
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

      case 'logline':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                核心概念
              </label>
              <textarea
                value={properties.coreConcept || ''}
                onChange={(e) => handlePropertyChange('coreConcept', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="ストーリーの核心となる概念"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                フック
              </label>
              <textarea
                value={properties.hook || ''}
                onChange={(e) => handlePropertyChange('hook', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="読者の興味を引く要素"
              />
            </div>
          </div>
        );

      case 'story':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                構造
              </label>
              <input
                type="text"
                value={properties.structure || ''}
                onChange={(e) => handlePropertyChange('structure', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="三幕構造、五幕構造など"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                テーマ
              </label>
              <input
                type="text"
                value={properties.theme || ''}
                onChange={(e) => handlePropertyChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ジャンル
              </label>
              <input
                type="text"
                value={properties.genre || ''}
                onChange={(e) => handlePropertyChange('genre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'cut':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ショットタイプ
              </label>
              <input
                type="text"
                value={properties.shotType || ''}
                onChange={(e) => handlePropertyChange('shotType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="close-up, medium, wideなど"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                継続時間（秒）
              </label>
              <input
                type="number"
                value={properties.duration || 0}
                onChange={(e) => handlePropertyChange('duration', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                トランジション
              </label>
              <input
                type="text"
                value={properties.transition || ''}
                onChange={(e) => handlePropertyChange('transition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="cut, fade, dissolveなど"
              />
            </div>
          </div>
        );

      case 'costume':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                キャラクターID
              </label>
              <input
                type="text"
                value={properties.characterId || ''}
                onChange={(e) => handlePropertyChange('characterId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                季節
              </label>
              <input
                type="text"
                value={properties.season || ''}
                onChange={(e) => handlePropertyChange('season', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                場面
              </label>
              <input
                type="text"
                value={properties.occasion || ''}
                onChange={(e) => handlePropertyChange('occasion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        );

      case 'camera-angle':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                アングル
              </label>
              <select
                value={properties.angle || 'medium'}
                onChange={(e) => handlePropertyChange('angle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="close-up">クローズアップ</option>
                <option value="medium">ミディアム</option>
                <option value="wide">ワイド</option>
                <option value="extreme-wide">エクストリームワイド</option>
                <option value="bird-eye">鳥瞰</option>
                <option value="worm-eye">虫瞰</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                カメラムーブメント
              </label>
              <select
                value={properties.movement || 'static'}
                onChange={(e) => handlePropertyChange('movement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="static">静止</option>
                <option value="pan">パン</option>
                <option value="tilt">ティルト</option>
                <option value="dolly">ドリー</option>
                <option value="track">トラッキング</option>
                <option value="crane">クレーン</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                フォーカス
              </label>
              <input
                type="text"
                value={properties.focus || ''}
                onChange={(e) => handlePropertyChange('focus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="被写体や焦点の説明"
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

        {/* Context Layers Selection (非コンテクストノードの場合のみ) */}
        {!isContext && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              コンテクストレイヤー
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
              {contextLayers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  コンテクストレイヤーがありません
                </p>
              ) : (
                contextLayers.map((layer) => {
                  const contextNode = nodes.find(n => n.id === layer.contextNodeId);
                  const isChecked = selectedLayerIds.includes(layer.contextNodeId);
                  
                  return (
                    <label
                      key={layer.contextNodeId}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleLayerToggle(layer.contextNodeId, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {contextNode?.data.label || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {layer.containedNodeIds.length} nodes
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

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

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
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

