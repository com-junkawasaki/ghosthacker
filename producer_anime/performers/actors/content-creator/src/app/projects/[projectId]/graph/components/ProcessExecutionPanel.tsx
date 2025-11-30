/**
 * Process Execution Panel Component
 * Processノードの実行UI
 */

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { GraphNodeData, ProcessNodeProperties } from './types';

interface ProcessExecutionPanelProps {
  node: Node<GraphNodeData> | null;
  onClose: () => void;
  onExecute: (nodeId: string, generationType: string, options?: any) => Promise<void>;
}

export default function ProcessExecutionPanel({
  node,
  onClose,
  onExecute,
}: ProcessExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    maxTokens: 2000,
    temperature: 0.7,
    size: '1024x1024' as '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792',
    quality: 'standard' as 'standard' | 'hd',
    style: 'vivid' as 'vivid' | 'natural',
  });

  useEffect(() => {
    if (node) {
      const properties = node.data.properties as ProcessNodeProperties;
      const lastResult = properties.lastExecutionResult;
      if (lastResult) {
        try {
          setExecutionResult(JSON.parse(lastResult));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [node]);

  if (!node) return null;

  const properties = node.data.properties as ProcessNodeProperties;
  const generationType = properties.generationType || 'document';
  const executionStatus = properties.executionStatus || 'idle';
  const generatedContent = properties.generatedContent;

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      await onExecute(node.id, generationType, options);
      
      // 実行結果を取得（簡易実装）
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/grpc/graph/node/${node.id}`);
          if (response.ok) {
            const data = await response.json();
            const nodeData = data.node;
            if (nodeData) {
              const props = typeof nodeData.properties === 'string'
                ? JSON.parse(nodeData.properties)
                : nodeData.properties || {};
              if (props.lastExecutionResult) {
                setExecutionResult(JSON.parse(props.lastExecutionResult));
              }
              if (props.generatedContent) {
                setExecutionResult((prev: any) => ({
                  ...prev,
                  content: props.generatedContent,
                }));
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch execution result:', e);
        }
        setIsExecuting(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed top-20 right-4 w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Process実行: {node.data.label}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* 実行状態 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">状態:</span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              executionStatus === 'running'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : executionStatus === 'completed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : executionStatus === 'error'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {executionStatus === 'running' ? '実行中' : 
             executionStatus === 'completed' ? '完了' : 
             executionStatus === 'error' ? 'エラー' : '待機中'}
          </span>
        </div>
        {properties.lastExecutionTime && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            最終実行: {new Date(properties.lastExecutionTime).toLocaleString('ja-JP')}
          </p>
        )}
      </div>

      {/* 実行オプション */}
      {generationType === 'document' && (
        <div className="mb-4 space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={options.maxTokens}
              onChange={(e) => setOptions(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2000 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={options.temperature}
              onChange={(e) => setOptions(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {generationType === 'image' && (
        <div className="mb-4 space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              サイズ
            </label>
            <select
              value={options.size}
              onChange={(e) => setOptions(prev => ({ ...prev, size: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1792x1024">1792x1024</option>
              <option value="1024x1792">1024x1792</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              品質
            </label>
            <select
              value={options.quality}
              onChange={(e) => setOptions(prev => ({ ...prev, quality: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="standard">Standard</option>
              <option value="hd">HD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              スタイル
            </label>
            <select
              value={options.style}
              onChange={(e) => setOptions(prev => ({ ...prev, style: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="vivid">Vivid</option>
              <option value="natural">Natural</option>
            </select>
          </div>
        </div>
      )}

      {/* 実行ボタン */}
      <div className="mb-4">
        <button
          onClick={handleExecute}
          disabled={isExecuting || executionStatus === 'running'}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExecuting || executionStatus === 'running' ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>実行中...</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>実行</span>
            </>
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* 結果プレビュー */}
      {executionResult && executionResult.success && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">実行結果</h4>
          {generationType === 'document' && executionResult.content && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {executionResult.content}
              </pre>
            </div>
          )}
          {generationType === 'image' && (executionResult.imageBase64 || executionResult.imageUrl) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <img
                src={executionResult.imageBase64 || executionResult.imageUrl}
                alt="Generated"
                className="w-full rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* 保存済みコンテンツ */}
      {generatedContent && !executionResult && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">保存済みコンテンツ</h4>
          {generationType === 'document' && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {generatedContent}
              </pre>
            </div>
          )}
          {generationType === 'image' && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <img
                src={generatedContent}
                alt="Generated"
                className="w-full rounded-md"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

