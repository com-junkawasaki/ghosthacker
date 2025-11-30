/**
 * Context Layer Sidebar Component
 * コンテクストレイヤー管理サイドバー
 * 
 * Features:
 * - レイヤーの追加・編集・削除
 * - レイヤーの表示/非表示トグル
 * - ドラッグ&ドロップによる順序変更
 * - レイヤーごとのノード数表示
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, ContextLayer } from './types';
import { createGraphNode, createGraphEdge, deleteGraphEdge, updateGraphNode } from '@/internal/grpc/services/graph_client';
import { classifyError, formatErrorForDisplay, logError, type AppError } from '@/utils/errorHandling';

interface ContextLayerSidebarProps {
  projectId: string;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  contextLayers: ContextLayer[];
  onLayersChange: (layers: ContextLayer[]) => void;
  onNodesChange: (nodes: Node<GraphNodeData>[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onReload: () => Promise<void>;
  onDebugLog?: (level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any) => void;
}

export default function ContextLayerSidebar({
  projectId,
  nodes,
  edges,
  contextLayers,
  onLayersChange,
  onNodesChange,
  onEdgesChange,
  onReload,
  onDebugLog,
}: ContextLayerSidebarProps) {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // iPad前提: 初期位置を左上に設定（DebugPanelが右下にあるため）
  const [position, setPosition] = useState(() => {
    // 初期位置は左上（画面サイズに応じて調整）
    if (typeof window !== 'undefined') {
      return { x: 16, y: 16 }; // 16px margin
    }
    return { x: 16, y: 16 }; // iPad のデフォルト値
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

  // デバッグログを追加する関数
  const addDebugLog = useCallback((level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any) => {
    console[level](`[ContextLayerSidebar] ${message}`, data || '');
    if (onDebugLog) {
      onDebugLog(level, `[ContextLayerSidebar] ${message}`, data);
    }
  }, [onDebugLog]);

  // レイヤーの表示/非表示を切り替え
  const toggleLayerVisibility = useCallback((layerId: string) => {
    const updatedLayers = contextLayers.map(layer =>
      layer.contextNodeId === layerId
        ? { ...layer, visible: !layer.visible }
        : layer
    );
    onLayersChange(updatedLayers);
  }, [contextLayers, onLayersChange]);

  // レイヤー名の編集開始
  const startEditing = useCallback((layer: ContextLayer) => {
    const contextNode = nodes.find(n => n.id === layer.contextNodeId);
    setEditingLayerId(layer.contextNodeId);
    setEditingLabel(contextNode?.data.label || '');
  }, [nodes]);

  // レイヤー名の保存
  const saveLayerLabel = useCallback(async (layerId: string, newLabel: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const contextNode = nodes.find(n => n.id === layerId);
      if (!contextNode) {
        throw new Error('コンテクストノードが見つかりません');
      }

      await updateGraphNode(
        layerId,
        newLabel,
        contextNode.data.properties,
        contextNode.data.jsonld || {}
      );
      
      await onReload();
      setEditingLayerId(null);
      setEditingLabel('');
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, 'ContextLayerSidebar.saveLayerLabel');
      setError(formatErrorForDisplay(appError));
    } finally {
      setLoading(false);
    }
  }, [nodes, onReload]);

  // レイヤーの削除（エッジのみ削除、ノードは残す）
  const deleteLayer = useCallback(async (layerId: string) => {
    if (!confirm('このレイヤーを削除しますか？ノード間の関連付けのみが削除され、コンテクストノード自体は残ります。')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // このレイヤーに関連するエッジを削除
      const edgesToDelete = edges.filter(edge => {
        const edgeData = edge.data as any;
        const edgeType = edgeData?.edgeType || '';
        const edgeLabel = edge.label || '';
        
        return (
          (edge.source === layerId && edgeType === 'contains') ||
          (edge.target === layerId && (edgeType === 'belongsTo' || edgeLabel === 'usesContext' || edgeLabel === 'belongsTo'))
        );
      });

      for (const edge of edgesToDelete) {
        await deleteGraphEdge(edge.id);
      }

      await onReload();
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, 'ContextLayerSidebar.deleteLayer');
      setError(formatErrorForDisplay(appError));
    } finally {
      setLoading(false);
    }
  }, [edges, onReload]);

  // レイヤーの順序変更
  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down') => {
    const currentIndex = contextLayers.findIndex(l => l.contextNodeId === layerId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= contextLayers.length) return;

    const updatedLayers = [...contextLayers];
    const [movedLayer] = updatedLayers.splice(currentIndex, 1);
    if (movedLayer) {
      updatedLayers.splice(newIndex, 0, { ...movedLayer, order: newIndex });
    }

    // orderを更新
    updatedLayers.forEach((layer, index) => {
      layer.order = index;
    });

    onLayersChange(updatedLayers);
  }, [contextLayers, onLayersChange]);

  // レイヤーごとのノード数を取得
  const getNodeCount = useCallback((layer: ContextLayer) => {
    return layer.containedNodeIds.length;
  }, []);

  // ドラッグオーバー時の処理
  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerId(layerId);
  }, []);

  // ドラッグエンター時の処理
  const handleDragEnter = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLayerId(layerId);
  }, []);

  // ドラッグリーブ時の処理
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 子要素への移動の場合はリセットしない
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverLayerId(null);
    }
  }, []);

  // ドロップ時の処理
  const handleDrop = useCallback(async (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLayerId(null);

    const draggedNodeId = e.dataTransfer.getData('application/reactflow-node-id');
    if (!draggedNodeId) {
      addDebugLog('warn', 'handleDrop: No node ID in dataTransfer');
      return;
    }

    // Contextノード自体はドロップできない
    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedNode) {
      addDebugLog('warn', 'handleDrop: Dragged node not found', { draggedNodeId });
      return;
    }

    if (draggedNode.data.isContext) {
      addDebugLog('warn', 'handleDrop: Cannot drop context node onto layer');
      return;
    }

    // 既存のusesContextエッジをチェック
    const existingEdge = edges.find(
      e => e.source === draggedNodeId && 
           e.target === layerId &&
           (e.label === 'usesContext' || e.label === 'belongsTo' || (e.data as any)?.edgeType === 'belongsTo')
    );

    if (existingEdge) {
      addDebugLog('info', 'handleDrop: Edge already exists', { 
        draggedNodeId, 
        layerId,
        edgeId: existingEdge.id 
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      addDebugLog('info', 'handleDrop: Creating usesContext edge', {
        sourceId: draggedNodeId,
        targetId: layerId,
      });

      await createGraphEdge(
        draggedNodeId,
        layerId,
        'usesContext',
        { edgeType: 'belongsTo' }
      );

      addDebugLog('info', 'handleDrop: Edge created successfully, reloading...');
      await onReload();
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, 'ContextLayerSidebar.handleDrop');
      setError(formatErrorForDisplay(appError));
      addDebugLog('error', 'handleDrop: Error occurred', {
        error: appError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [nodes, edges, onReload, addDebugLog]);

  // 新しいコンテクストレイヤーの作成
  const createNewLayer = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    addDebugLog('info', 'createNewLayer: Starting...', {
      currentLayersCount: contextLayers.length,
      projectId,
    });
    
    try {
      const label = `Context Layer ${contextLayers.length + 1}`;
      const jsonld = {
        '@context': {
          '@version': 1.1,
        },
        '@type': 'gh:Context',
      };

      addDebugLog('info', 'createNewLayer: Creating node with:', {
        label,
        properties: { isContext: true },
        jsonld,
      });

      const nodeId = await createGraphNode(
        label,
        { isContext: true },
        jsonld
      );

      addDebugLog('info', 'createNewLayer: Node created', { nodeId });

      if (!nodeId) {
        addDebugLog('error', 'createNewLayer: No nodeId returned');
        throw new Error('ノードIDが返されませんでした');
      }

      addDebugLog('info', 'createNewLayer: Reloading graph data...');
      // データを再読み込み
      const reloadStartTime = Date.now();
      await onReload();
      const reloadDuration = Date.now() - reloadStartTime;
      
      addDebugLog('info', 'createNewLayer: Reload completed', { 
        duration: `${reloadDuration}ms`,
        waitingForDBSync: true,
      });
      
      // 再読み込み後に新しいレイヤーが含まれているか確認
      // 少し待ってから確認（データベースの反映を待つ）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 再読み込み後の状態を確認
      addDebugLog('info', 'createNewLayer: Checking if new layer appears in contextLayers', {
        expectedNodeId: nodeId,
        currentContextLayers: contextLayers.map(l => ({
          contextNodeId: l.contextNodeId,
          containedNodeIds: l.containedNodeIds.length,
        })),
      });
      
      addDebugLog('info', 'createNewLayer: Success! Closing modal.');
      setShowAddModal(false);
    } catch (error) {
      addDebugLog('error', 'createNewLayer: Error occurred', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const appError = classifyError(error);
      logError(appError, 'ContextLayerSidebar.createNewLayer');
      const errorMessage = formatErrorForDisplay(appError);
      addDebugLog('error', 'createNewLayer: Error message', { errorMessage });
      setError(errorMessage);
      // エラーが発生してもモーダルは閉じる（ユーザーが再試行できるように）
      setShowAddModal(false);
    } finally {
      setLoading(false);
      addDebugLog('info', 'createNewLayer: Finished, loading set to false');
    }
  }, [contextLayers, onReload, projectId, addDebugLog]);

  // 既存のコンテクストノードをレイヤーとして追加
  const addExistingContextAsLayer = useCallback(async (nodeId: string) => {
    // 既にレイヤーとして存在するかチェック
    const exists = contextLayers.some(l => l.contextNodeId === nodeId);
    if (exists) {
      alert('このコンテクストノードは既にレイヤーとして登録されています。');
      return;
    }

    // レイヤーとして追加（既存のノードなので、エッジの作成は不要）
    await onReload();
    setShowAddModal(false);
  }, [contextLayers, onReload]);

  // ソート済みレイヤーリスト
  const sortedLayers = [...contextLayers].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    return orderA - orderB;
  });

  // ドラッグハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // ヘッダー領域またはドラッグハンドルをクリックした場合のみドラッグ開始
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle') || target.closest('.header-drag-area')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && sidebarRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 境界チェック（iPad画面内に収める）
      const maxX = window.innerWidth - (sidebarRef.current.offsetWidth || 0) - 16;
      const maxY = window.innerHeight - (sidebarRef.current.offsetHeight || 0) - 16;

      setPosition({
        x: Math.max(16, Math.min(newX, maxX)),
        y: Math.max(16, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // マウスイベントの登録
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 画面リサイズ時に位置を調整（iPad前提）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (!sidebarRef.current) return;
      const sidebarWidth = sidebarRef.current.offsetWidth || 320;
      const sidebarHeight = sidebarRef.current.offsetHeight || 500;
      const margin = 16;
      // 画面外に出ないように位置を調整
      setPosition(prev => ({
        x: Math.max(margin, Math.min(prev.x, window.innerWidth - sidebarWidth - margin)),
        y: Math.max(margin, Math.min(prev.y, window.innerHeight - sidebarHeight - margin)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={sidebarRef}
      className={`fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-64 h-12' : 'w-[320px] max-h-[500px]'
      } flex flex-col z-50`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle */}
      <div 
        className="header-drag-area px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="drag-handle text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            コンテクストレイヤー
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          title={isCollapsed ? '展開' : '折りたたみ'}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {!isCollapsed && (
        <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? '処理中...' : '+ レイヤーを追加'}
        </button>
        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedLayers.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            コンテクストレイヤーがありません
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLayers.map((layer) => {
              const contextNode = nodes.find(n => n.id === layer.contextNodeId);
              const isEditing = editingLayerId === layer.contextNodeId;
              const nodeCount = getNodeCount(layer);

              return (
                <div
                  key={layer.contextNodeId}
                  className={`group bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
                    draggedLayerId === layer.contextNodeId ? 'opacity-50' : ''
                  } ${
                    dragOverLayerId === layer.contextNodeId ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  draggable
                  onDragStart={() => setDraggedLayerId(layer.contextNodeId)}
                  onDragEnd={() => setDraggedLayerId(null)}
                  onDragOver={(e) => handleDragOver(e, layer.contextNodeId)}
                  onDragEnter={(e) => handleDragEnter(e, layer.contextNodeId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, layer.contextNodeId)}
                >
                  <div className="flex items-start gap-2">
                    {/* Drag Handle */}
                    <div className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveLayerLabel(layer.contextNodeId, editingLabel);
                              } else if (e.key === 'Escape') {
                                setEditingLayerId(null);
                                setEditingLabel('');
                              }
                            }}
                            onBlur={() => {
                              if (editingLabel) {
                                saveLayerLabel(layer.contextNodeId, editingLabel);
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate flex-1 cursor-pointer"
                              onClick={() => startEditing(layer)}
                              title={contextNode?.data.label || ''}
                            >
                              {contextNode?.data.label || 'Unknown'}
                            </h3>
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                              {nodeCount}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Visibility Toggle */}
                      <button
                        onClick={() => toggleLayerVisibility(layer.contextNodeId)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={layer.visible !== false ? '非表示' : '表示'}
                      >
                        {layer.visible !== false ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.47 3.47L12 12m-3.41-3.41l3.47 3.47M12 12l3.41 3.41M12 12l-3.41-3.41m6.82 6.82L21 21" />
                          </svg>
                        )}
                      </button>

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => startEditing(layer)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => deleteLayer(layer.contextNodeId)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="削除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Order Controls */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => moveLayer(layer.contextNodeId, 'up')}
                      disabled={sortedLayers.findIndex(l => l.contextNodeId === layer.contextNodeId) === 0}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLayer(layer.contextNodeId, 'down')}
                      disabled={sortedLayers.findIndex(l => l.contextNodeId === layer.contextNodeId) === sortedLayers.length - 1}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Layer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              レイヤーを追加
            </h3>
            
            <div className="space-y-4">
              <button
                onClick={createNewLayer}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                新しいコンテクストレイヤーを作成
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  既存のコンテクストノードをレイヤーとして追加:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {nodes
                    .filter(n => n.data.isContext && !contextLayers.some(l => l.contextNodeId === n.id))
                    .map(node => (
                      <button
                        key={node.id}
                        onClick={() => addExistingContextAsLayer(node.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {node.data.label}
                      </button>
                    ))}
                  {nodes.filter(n => n.data.isContext && !contextLayers.some(l => l.contextNodeId === n.id)).length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      利用可能なコンテクストノードがありません
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

