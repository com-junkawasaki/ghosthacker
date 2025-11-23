/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/debug-panel
 * 
 * Debug panel component for manga editor
 */
'use client';

import { useState } from 'react';
import { match } from 'ts-pattern';
import type { DataState } from '@/types/manga';

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
  scriptId?: string | null;
  selectedPageId?: string;
}

export function DebugPanel({
  projectState,
  scriptsState,
  pagesState,
  panelsState,
  scriptId,
  selectedPageId,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const renderState = (state: { loading: boolean; error?: Error; data?: unknown }, label: string) => {
    // Check loading first
    if (state.loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">{label}: 読み込み中...</span>
        </div>
      );
    }
    
    // Check error
    if (state.error) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <div className="flex-1">
            <span className="text-sm text-red-600">{label}: エラー</span>
            <div className="text-xs text-red-500 mt-1">{state.error.message}</div>
          </div>
        </div>
      );
    }
    
    // Check data
    if (state.data != null) {
      const dataArray = Array.isArray(state.data) ? state.data : (state.data as Record<string, unknown>);
      const count = Array.isArray(dataArray) ? dataArray.length : (dataArray ? 1 : 0);
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600">{label}: 成功</span>
          <span className="text-xs text-gray-500">
            ({Array.isArray(state.data) ? `${state.data.length}件` : 'データあり'})
          </span>
        </div>
      );
    }
    
    // Default: not executed
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-sm text-gray-500">{label}: 未実行</span>
      </div>
    );
  };

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
          {panelsState.data && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">データを表示</summary>
              <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto max-h-40">
                {JSON.stringify(panelsState.data, null, 2)}
              </pre>
            </details>
          )}
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

