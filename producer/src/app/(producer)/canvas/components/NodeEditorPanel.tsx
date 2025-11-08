'use client';

import { useState, useEffect } from 'react';
import type { Node as RFNode } from '@reactflow/core';
import type { NodeData } from '@/pipeline/node-types';
import { saveCanvasToJsonLd, loadCanvasFromJsonLd } from '@/lib/canvas-jsonld';
import { validateCanvasJsonLd, formatValidationErrors } from '@/lib/shacl-validator';
import type { Edge as RFEdge } from '@reactflow/core';

interface NodeEditorPanelProps {
  selectedNode: RFNode<NodeData> | null;
  nodes: RFNode<NodeData>[];
  edges: RFEdge[];
  onNodeUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onSave: () => void;
}

export default function NodeEditorPanel({
  selectedNode,
  nodes,
  edges,
  onNodeUpdate,
  onSave,
}: NodeEditorPanelProps) {
  const [nodeData, setNodeData] = useState<Partial<NodeData>>({});
  const [validationErrors, setValidationErrors] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    } else {
      setNodeData({});
    }
  }, [selectedNode]);

  const handleFieldChange = (field: keyof NodeData, value: unknown) => {
    const updated = { ...nodeData, [field]: value };
    setNodeData(updated);
    
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, updated);
    }
  };

  const handleSave = async () => {
    if (!selectedNode) return;

    setIsSaving(true);
    try {
      // バリデーション
      const { canvasToJsonLd } = await import('@/lib/canvas-jsonld');
      const jsonLd = canvasToJsonLd(nodes, edges);
      const validation = validateCanvasJsonLd(jsonLd);
      
      if (!validation.valid) {
        setValidationErrors(formatValidationErrors(validation));
        return;
      }

      // JSON-LD ファイルに保存
      saveCanvasToJsonLd(nodes, edges);
      
      setValidationErrors('');
      onSave();
    } catch (error) {
      setValidationErrors(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500">No node selected</div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Node Editor</h2>
          <div className="text-xs text-gray-500 mb-4">
            ID: {selectedNode.id}
          </div>
        </div>

        {/* Node Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Node Type
          </label>
          <input
            type="text"
            value={nodeData.type || ''}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            readOnly
          />
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={nodeData.label || ''}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={nodeData.status || 'idle'}
            onChange={(e) => handleFieldChange('status', e.target.value as NodeData['status'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="idle">Idle</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Config (JSON) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Config (JSON)
          </label>
          <textarea
            value={JSON.stringify(nodeData.config || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange('config', parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            rows={6}
          />
        </div>

        {/* Character ID (for CharacterNode) */}
        {nodeData.type === 'CharacterNode' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Character ID
            </label>
            <input
              type="text"
              value={(nodeData as { characterId?: string }).characterId || ''}
              onChange={(e) => handleFieldChange('characterId' as keyof NodeData, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}

        {/* Episode ID (for EpisodeNode) */}
        {nodeData.type === 'EpisodeNode' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Episode ID
            </label>
            <input
              type="text"
              value={(nodeData as { episodeId?: string }).episodeId || ''}
              onChange={(e) => handleFieldChange('episodeId' as keyof NodeData, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800 font-medium mb-1">Validation Errors</div>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">{validationErrors}</pre>
          </div>
        )}

        {/* Save Button */}
        <div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save to JSON-LD'}
          </button>
        </div>
      </div>
    </div>
  );
}

