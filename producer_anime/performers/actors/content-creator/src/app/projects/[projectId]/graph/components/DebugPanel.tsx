/**
 * Debug Panel Component
 * デバッグ情報を表示するパネル
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, ContextLayer } from './types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DebugPanelProps {
  projectId: string;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  contextLayers: ContextLayer[];
  debugLogs: Array<{ timestamp: number; level: 'log' | 'error' | 'warn' | 'info'; message: string; data?: any }>;
}

export default function DebugPanel({
  projectId,
  nodes,
  edges,
  contextLayers,
  debugLogs,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'log' | 'error' | 'warn' | 'info'>('all');
  // iPad前提: 初期位置を右下に設定（ContextLayerSidebarが左上にあるため）
  const [position, setPosition] = useState(() => {
    // 初期位置は右下（画面サイズに応じて調整）
    if (typeof window !== 'undefined') {
      const panelWidth = 380;
      const panelHeight = 500;
      const margin = 16;
      return { 
        x: Math.max(margin, window.innerWidth - panelWidth - margin), 
        y: Math.max(margin, window.innerHeight - panelHeight - margin)
      };
    }
    return { x: 628, y: 252 }; // iPad landscape (1024x768) のデフォルト値: 1024-380-16=628, 768-500-16=252
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node && autoScroll) {
      node.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  const filteredLogs = debugLogs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  // 画面リサイズ時に位置を調整（iPad前提）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      const panelWidth = 380;
      const panelHeight = 500;
      const margin = 16;
      // 画面外に出ないように位置を調整
      setPosition(prev => ({
        x: Math.max(margin, Math.min(prev.x, window.innerWidth - panelWidth - margin)),
        y: Math.max(margin, Math.min(prev.y, window.innerHeight - panelHeight - margin)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ドラッグハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // ヘッダー領域をクリックした場合のみドラッグ開始
    const target = e.target as HTMLElement;
    if (target.closest('.header-drag-area') || target.closest('.drag-handle')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && panelRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 境界チェック（iPad画面内に収める）
      const maxX = window.innerWidth - (panelRef.current.offsetWidth || 0) - 16;
      const maxY = window.innerHeight - (panelRef.current.offsetHeight || 0) - 16;

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

  // オーファンノード（コンテクストレイヤーに属していないノード）を計算
  const allNonContextNodeIds = new Set(
    nodes.filter(n => !n.data.isContext).map(n => n.id)
  );
  const nodesInLayers = new Set(
    contextLayers.flatMap(layer => layer.containedNodeIds)
  );
  const orphanNodes = Array.from(allNonContextNodeIds).filter(
    nodeId => !nodesInLayers.has(nodeId)
  );

  const stats = {
    totalNodes: nodes.length,
    contextNodes: nodes.filter(n => n.data.isContext).length,
    regularNodes: nodes.filter(n => !n.data.isContext).length,
    totalEdges: edges.length,
    contextLayers: contextLayers.length,
    layersWithNodes: contextLayers.filter(l => l.containedNodeIds.length > 0).length,
    orphanNodes: orphanNodes.length,
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="Open Debug Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-64 h-12' : 'w-[380px] max-h-[500px]'
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
            Debug Panel
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            title={isCollapsed ? '展開' : '折りたたみ'}
          >
            {isCollapsed ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            title="Close Debug Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
      {/* Stats */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Statistics</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Nodes:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.totalNodes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Context Nodes:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.contextNodes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Regular Nodes:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.regularNodes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Edges:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.totalEdges}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Context Layers:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.contextLayers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Layers with Nodes:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{stats.layersWithNodes}</span>
          </div>
          <div className="flex justify-between">
            <span className={`text-gray-600 dark:text-gray-400 ${stats.orphanNodes > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
              Orphan Nodes:
            </span>
            <span className={`font-mono ${stats.orphanNodes > 0 ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
              {stats.orphanNodes}
            </span>
          </div>
          {stats.orphanNodes > 0 && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-700 dark:text-orange-300">
              ⚠️ {stats.orphanNodes} node(s) are not in any context layer
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400">Filter:</label>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All</option>
          <option value="log">Log</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={() => {
            const text = filteredLogs.map(log => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              let line = `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
              if (log.data) {
                line += '\n' + JSON.stringify(log.data, null, 2);
              }
              return line;
            }).join('\n\n');
            navigator.clipboard.writeText(text);
          }}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title="Copy all filtered logs"
        >
          📋 Copy All
        </button>
        <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 relative">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            No logs
          </div>
        ) : (
          <div className="relative">
            {/* コピー用の選択可能なテキストエリア（Cmd+Aで選択可能、背景に配置） */}
            <div 
              className="absolute inset-0 p-2 font-mono text-[10px] whitespace-pre-wrap text-transparent select-text z-0 break-words overflow-y-auto"
              style={{ 
                WebkitUserSelect: 'text',
                userSelect: 'text',
                color: 'transparent',
                pointerEvents: 'auto',
              }}
              onKeyDown={(e) => {
                // Cmd+A (Mac) or Ctrl+A (Windows/Linux) で全選択
                if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                  e.preventDefault();
                  const selection = window.getSelection();
                  const range = document.createRange();
                  range.selectNodeContents(e.currentTarget);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }}
              onClick={(e) => {
                // クリック時にフォーカスを設定（Cmd+Aを有効にするため）
                e.currentTarget.focus();
              }}
              tabIndex={0}
            >
              {filteredLogs.map((log, index) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                return `[${time}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}\n\n`;
              }).join('')}
            </div>
            
            {/* 視覚的な表示（オーバーレイ、ボタンはクリック可能） */}
            <div className="relative z-10 space-y-1 font-mono" style={{ pointerEvents: 'none' }}>
              {filteredLogs.map((log, index) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const levelColors = {
                log: 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600',
                info: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600',
                warn: 'text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600',
                error: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-600',
              };
              
              const bgColors = {
                log: 'bg-gray-50 dark:bg-gray-900',
                info: 'bg-blue-50 dark:bg-blue-900/20',
                warn: 'bg-yellow-50 dark:bg-yellow-900/20',
                error: 'bg-red-50 dark:bg-red-900/20',
              };
              
              // 重要な情報をメッセージに含める
              let enhancedMessage = log.message;
              if (log.data) {
                // エラーの場合、重要な情報をメッセージに追加
                if (log.level === 'error' && log.data.error) {
                  enhancedMessage += `: ${log.data.error}`;
                }
                // ノードIDがある場合
                if (log.data.nodeId) {
                  enhancedMessage += ` [${log.data.nodeId}]`;
                }
                // checkResultsがある場合（コンテクストノード検出）
                if (log.data.checkResults) {
                  const checks = log.data.checkResults;
                  const passedChecks = Object.entries(checks)
                    .filter(([_, passed]) => passed)
                    .map(([name]) => name);
                  if (passedChecks.length > 0) {
                    enhancedMessage += ` ✓${passedChecks.join(',')}`;
                  } else {
                    enhancedMessage += ` ✗all failed`;
                  }
                }
              }
              
              // コピー用のテキスト形式を生成（見やすい形式）
              const copyableText = `[${time}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`;
              
              return (
                <div
                  key={index}
                  className={`text-xs p-2 rounded border-2 ${levelColors[log.level]} ${bgColors[log.level]} group hover:shadow-md transition-shadow select-none pointer-events-none`}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="font-mono text-gray-500 dark:text-gray-500 text-[10px] whitespace-nowrap select-all">{time}</span>
                    <span className="font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 select-all">{log.level}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(copyableText);
                        e.currentTarget.textContent = '✓';
                        setTimeout(() => {
                          e.currentTarget.innerHTML = '<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>';
                        }, 2000);
                      }}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 pointer-events-auto"
                      title="Copy this log entry"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-1 break-words font-medium">{enhancedMessage}</div>
                  {log.data && (
                    <details className="mt-2 pointer-events-auto" onToggle={(e) => e.stopPropagation()}>
                      <summary className="cursor-pointer text-[10px] text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold select-none pointer-events-auto">
                        📋 Data (Click to expand)
                      </summary>
                      <div className="mt-2 relative pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = JSON.stringify(log.data, null, 2);
                            navigator.clipboard.writeText(text);
                            const btn = e.currentTarget;
                            btn.textContent = '✓ Copied!';
                            setTimeout(() => {
                              btn.textContent = '📋 Copy JSON';
                            }, 2000);
                          }}
                          className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-20"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          📋 Copy JSON
                        </button>
                        <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-[10px] overflow-x-auto border border-gray-200 dark:border-gray-700 select-none">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

