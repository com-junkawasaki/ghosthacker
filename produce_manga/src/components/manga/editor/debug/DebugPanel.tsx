/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/debug-panel
 * 
 * Debug panel component for manga editor with XState Inspector integration
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { match } from 'ts-pattern';
import type { ActorSnapshot } from 'xstate';
import type { DebugState, CanvasState } from '@/types/manga';
import { matchDebugState as matchDebug, matchCanvasState as matchCanvas } from '@/types/manga';
import type { MangaEditorPageEvent } from '@/types/mangaMachine';
import { FullTestRunner } from './FullTestRunner';

interface DebugPanelProps {
  projectState: {
    loading: boolean;
    error?: Error;
    data?: unknown;
  };
  scriptsState: {
    loading: boolean;
    error?: Error;
    data?: unknown;
  };
  pagesState: {
    loading: boolean;
    error?: Error;
    data?: unknown;
  };
  panelsState: {
    loading: boolean;
    error?: Error;
    data?: unknown;
  };
  canvasState?: {
    panelsCount: number;
    selectedNodeId?: string;
    speechBubblesCount: number;
    stageWidth?: number;
    stageHeight?: number;
    zoom?: number;
    selectedTool?: string;
  };
  scriptId?: string | null;
  selectedPageId?: string;
  // XState machine snapshot and send function
  snapshot?: ActorSnapshot<unknown, MangaEditorPageEvent>;
  send?: (event: MangaEditorPageEvent) => void;
  projectId?: string;
}

export function DebugPanel({
  projectState,
  scriptsState,
  pagesState,
  panelsState,
  canvasState,
  scriptId,
  selectedPageId,
  snapshot,
  send,
  projectId,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [eventHistory, setEventHistory] = useState<Array<{ event: MangaEditorPageEvent; timestamp: number }>>([]);
  const [previousState, setPreviousState] = useState<string | Record<string, unknown> | undefined>(undefined);

  // Track state changes to infer events (simplified approach)
  useEffect(() => {
    if (snapshot) {
      const currentState = snapshot.value;
      if (previousState !== undefined && previousState !== currentState) {
        // State changed - could add to history if needed
      }
      setPreviousState(currentState);
    }
  }, [snapshot, previousState]);

  // Get current state from snapshot
  const currentState = snapshot?.value ?? 'unknown';
  const context = snapshot?.context as { data?: { error?: Error }; editor?: unknown } | undefined;
  const machineError = context?.data?.error;
  const stateDescription = typeof currentState === 'string' ? currentState : JSON.stringify(currentState);

  // Convert state to DebugState union type
  const toDebugState = (state: { loading: boolean; error?: Error; data?: unknown }): DebugState => {
    if (state.loading) {
      return { status: 'loading' };
    }
    if (state.error) {
      return { status: 'error', error: state.error };
    }
    if (state.data != null) {
      const count = Array.isArray(state.data) ? state.data.length : 1;
      return { status: 'success', data: state.data, count };
    }
    return { status: 'idle' };
  };

  const renderState = (state: { loading: boolean; error?: Error; data?: unknown }, label: string) => {
    const debugState = toDebugState(state);
    
    return matchDebug(debugState, {
      loading: () => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">{label}: 読み込み中...</span>
        </div>
      ),
      error: (error) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="flex-1">
            <span className="text-sm text-red-600">{label}: エラー</span>
            <div className="text-xs text-red-500 mt-1">{error.message}</div>
          </div>
        </div>
      ),
      success: (data, count) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600">{label}: 成功</span>
          <span className="text-xs text-gray-500">
            ({Array.isArray(data) ? `${data.length}件` : 'データあり'})
          </span>
        </div>
      ),
      idle: () => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="text-sm text-gray-500">{label}: 未実行</span>
        </div>
      ),
    });
  };

  // Convert canvasState to CanvasState union type
  const canvasStateUnion: CanvasState = useMemo(() => {
    if (!canvasState) {
      return { status: 'uninitialized' };
    }
    return {
      status: 'ready',
      panelsCount: canvasState.panelsCount,
      selectedNodeId: canvasState.selectedNodeId,
      speechBubblesCount: canvasState.speechBubblesCount,
      stageWidth: canvasState.stageWidth ?? 1200,
      stageHeight: canvasState.stageHeight ?? 1800,
      zoom: canvasState.zoom ?? 1.0,
      selectedTool: canvasState.selectedTool ?? 'select',
    };
  }, [canvasState]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 z-50 bg-purple-600 text-white px-3 py-2 rounded-l-lg shadow-lg hover:bg-purple-700 transition-colors"
        title="デバッグパネルを開く"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">🐛 デバッグパネル</h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 text-xl"
          title="閉じる"
        >
          ×
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* XState Machine State */}
        {snapshot && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">XState Machine State</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${machineError ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-sm text-gray-600">
                  現在の状態: <span className="font-mono text-blue-600">{stateDescription}</span>
                </span>
              </div>
              {machineError && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <div className="font-semibold text-red-700">マシンエラー:</div>
                  <div className="text-red-600">{machineError.message}</div>
                </div>
              )}
              {snapshot.context && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">コンテキストを表示</summary>
                  <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                    {JSON.stringify(snapshot.context, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Event History */}
        {eventHistory.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">イベント履歴 ({eventHistory.length})</h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {eventHistory.slice().reverse().map((item, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <div className="font-mono text-gray-700">{item.event.type}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Test Runner */}
        {send && projectId && snapshot && (
          <div className="border-b border-gray-200 pb-4">
            <FullTestRunner 
              send={(event) => {
                setEventHistory((prev) => [...prev, { event, timestamp: Date.now() }].slice(-50));
                send(event);
              }} 
              currentState={currentState} 
              projectId={projectId} 
            />
          </div>
        )}

        {/* ステップ1: プロジェクト取得 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">ステップ1: プロジェクト取得</h3>
          {renderState(projectState, 'プロジェクト')}
          {projectState.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">データを表示</summary>
              <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                {JSON.stringify(projectState.data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* ステップ2: スクリプト取得 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">ステップ2: スクリプト取得</h3>
          {renderState(scriptsState, 'スクリプト')}
          <div className="mt-2 text-xs text-gray-600">
            scriptId: {scriptId ? (
              <span className="font-mono text-green-600">{scriptId}</span>
            ) : (
              <span className="text-gray-400">未設定</span>
            )}
          </div>
          {scriptsState.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">データを表示</summary>
              <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                {JSON.stringify(scriptsState.data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* ステップ3: ページ取得 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">ステップ3: ページ取得</h3>
          {renderState(pagesState, 'ページ')}
          <div className="mt-2 text-xs text-gray-600">
            selectedPageId: {selectedPageId ? (
              <span className="font-mono text-green-600">{selectedPageId}</span>
            ) : (
              <span className="text-gray-400">未選択</span>
            )}
          </div>
          {pagesState.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">データを表示</summary>
              <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                {JSON.stringify(pagesState.data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* ステップ4: パネル取得 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">ステップ4: パネル取得</h3>
          {renderState(panelsState, 'パネル')}
          <div className="mt-2 text-xs text-gray-600">
            selectedPageId: {selectedPageId ? (
              <span className="font-mono text-green-600">{selectedPageId}</span>
            ) : (
              <span className="text-red-500">未選択（パネル取得がスキップされます）</span>
            )}
          </div>
          {panelsState.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">データを表示</summary>
              <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                {JSON.stringify(panelsState.data, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* ステップ5: Canvas状態 */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">ステップ5: Canvas状態</h3>
          {matchCanvas(canvasStateUnion, {
            uninitialized: () => (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-sm text-gray-500">Canvas: 未初期化</span>
              </div>
            ),
            ready: (state) => (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-600">Canvas: 初期化済み</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <div>
                    <span className="font-semibold">パネル数:</span>{' '}
                    <span className="font-mono">{state.panelsCount}</span>
                  </div>
                  <div>
                    <span className="font-semibold">選択ノード:</span>{' '}
                    {state.selectedNodeId ? (
                      <span className="font-mono text-green-600">{state.selectedNodeId}</span>
                    ) : (
                      <span className="text-gray-400">なし</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">吹き出し数:</span>{' '}
                    <span className="font-mono">{state.speechBubblesCount}</span>
                  </div>
                  <div>
                    <span className="font-semibold">ステージサイズ:</span>{' '}
                    <span className="font-mono">
                      {state.stageWidth} × {state.stageHeight}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">ズーム:</span>{' '}
                    <span className="font-mono">{Math.round(state.zoom * 100)}%</span>
                  </div>
                  <div>
                    <span className="font-semibold">選択ツール:</span>{' '}
                    <span className="font-mono">{state.selectedTool}</span>
                  </div>
                </div>
              </div>
            ),
          })}
        </div>

        {/* デバッグ用ステップコード */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">デバッグ用ステップコード</h3>
          <div className="space-y-2">
            {[
              {
                label: 'Konvaステージを取得',
                code: `// Konvaステージを取得\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  console.log('Stage:', stage);\n  console.log('Stage size:', stage.width(), 'x', stage.height());\n  console.log('Stage children:', stage.children);\n} else {\n  console.warn('Stage not found. Canvas may not be initialized.');\n}`,
              },
              {
                label: 'パネル情報を取得',
                code: `// パネル情報を取得\nconst panelsCount = ${canvasState?.panelsCount || 0};\nconsole.log('Panels count:', panelsCount);\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  const panelGroups = stage.find('Group[name^="Panel-"]');\n  console.log('Panel groups found:', panelGroups.length);\n  panelGroups.forEach((group, i) => {\n    console.log(\`Panel \${i + 1}:\`, {\n      id: group.id(),\n      x: group.x(),\n      y: group.y(),\n      width: group.width(),\n      height: group.height(),\n    });\n  });\n}`,
              },
              {
                label: '選択ノードを確認',
                code: `// 選択ノードを確認\nconst selectedNodeId = '${canvasState?.selectedNodeId || 'none'}';\nconsole.log('Selected node ID:', selectedNodeId);\nconst stage = window.__KONVA_STAGE__;\nif (stage && selectedNodeId !== 'none') {\n  const node = stage.findOne('#' + selectedNodeId);\n  if (node) {\n    console.log('Selected node:', node);\n    console.log('Node position:', { x: node.x(), y: node.y() });\n    console.log('Node size:', { width: node.width(), height: node.height() });\n  } else {\n    console.warn('Node not found:', selectedNodeId);\n  }\n}`,
              },
              {
                label: 'Canvas要素を検索',
                code: `// Canvas要素を検索\nconst canvas = document.querySelector('canvas');\nif (canvas) {\n  console.log('Canvas element:', canvas);\n  console.log('Canvas size:', canvas.width, 'x', canvas.height);\n  console.log('Canvas style:', window.getComputedStyle(canvas));\n} else {\n  console.warn('Canvas element not found');\n}`,
              },
              {
                label: 'Konvaレイヤーを確認',
                code: `// Konvaレイヤーを確認\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  const layers = stage.children;\n  console.log('Layers count:', layers.length);\n  layers.forEach((layer, i) => {\n    console.log(\`Layer \${i + 1}:\`, {\n      name: layer.name(),\n      children: layer.children.length,\n      visible: layer.visible(),\n    });\n  });\n}`,
              },
              {
                label: '吹き出しを確認',
                code: `// 吹き出しを確認\nconst speechBubblesCount = ${canvasState?.speechBubblesCount || 0};\nconsole.log('Speech bubbles count:', speechBubblesCount);\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  const bubbles = stage.find('Group[name="SpeechBubbleGroup"]');\n  console.log('Speech bubble groups found:', bubbles.length);\n  bubbles.forEach((bubble, i) => {\n    const textNode = bubble.findOne('Text');\n    console.log(\`Bubble \${i + 1}:\`, {\n      id: bubble.id(),\n      text: textNode?.text(),\n      position: { x: bubble.x(), y: bubble.y() },\n    });\n  });\n}`,
              },
              {
                label: 'ステージの全ノードを一覧',
                code: `// ステージの全ノードを一覧\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  const allNodes = stage.find('*');\n  console.log('All nodes count:', allNodes.length);\n  allNodes.forEach((node, i) => {\n    console.log(\`Node \${i + 1}:\`, {\n      id: node.id(),\n      name: node.name(),\n      className: node.className,\n      position: { x: node.x(), y: node.y() },\n    });\n  });\n}`,
              },
              {
                label: 'ステージのJSONをエクスポート',
                code: `// ステージのJSONをエクスポート\nconst stage = window.__KONVA_STAGE__;\nif (stage) {\n  const json = stage.toJSON();\n  console.log('Stage JSON:', json);\n  // クリップボードにコピー\n  navigator.clipboard.writeText(JSON.stringify(json, null, 2));\n  console.log('JSON copied to clipboard');\n}`,
              },
            ].map((item, index) => (
              <div key={index} className="border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.code);
                      setCopiedCode(`${index}`);
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                  >
                    {copiedCode === `${index}` ? '✓ コピー済み' : 'コピー'}
                  </button>
                </div>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto font-mono">
                  {item.code}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* エラー詳細 */}
        {(projectState.error || scriptsState.error || pagesState.error || panelsState.error) && (
          <div className="border-t border-red-200 pt-4">
            <h3 className="font-semibold text-sm text-red-700 mb-2">エラー詳細</h3>
            <div className="space-y-2">
              {projectState.error && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <div className="font-semibold text-red-700">プロジェクト:</div>
                  <div className="text-red-600">{projectState.error.message}</div>
                </div>
              )}
              {scriptsState.error && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <div className="font-semibold text-red-700">スクリプト:</div>
                  <div className="text-red-600">{scriptsState.error.message}</div>
                </div>
              )}
              {pagesState.error && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <div className="font-semibold text-red-700">ページ:</div>
                  <div className="text-red-600">{pagesState.error.message}</div>
                </div>
              )}
              {panelsState.error && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <div className="font-semibold text-red-700">パネル:</div>
                  <div className="text-red-600">{panelsState.error.message}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

