/**
 * Process Context Hook
 * Processノードの上位contextと関連ノードを取得するフック
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData } from './types';

interface ProcessContext {
  contextNodes: Node<GraphNodeData>[];
  relatedNodes: Node<GraphNodeData>[];
  contextData: Record<string, any>;
}

export function useProcessContext() {
  /**
   * 上位contextを取得（直接接続 + グラフトラバーサル）
   */
  const getProcessContext = useCallback((
    processNodeId: string,
    nodes: Node<GraphNodeData>[],
    edges: Edge[]
  ): ProcessContext => {
    const contextNodes: Node<GraphNodeData>[] = [];
    const relatedNodes: Node<GraphNodeData>[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // 1. 直接接続されたbelongsToエッジを辿る
    const findDirectContexts = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      edges.forEach(edge => {
        if (edge.target === nodeId) {
          const sourceNode = nodeMap.get(edge.source);
          if (sourceNode && sourceNode.data.isContext) {
            if (!contextNodes.find(n => n.id === sourceNode.id)) {
              contextNodes.push(sourceNode);
            }
            // Contextノードからさらに上位を探索
            findDirectContexts(sourceNode.id);
          }
        }
      });
    };

    findDirectContexts(processNodeId);

    // 2. グラフトラバーサルで階層を遡る
    const traverseUp = (nodeId: string, path: Set<string> = new Set()) => {
      if (path.has(nodeId)) return; // 循環を防ぐ
      path.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      // 親ノードを探索
      edges.forEach(edge => {
        if (edge.target === nodeId) {
          const parentNode = nodeMap.get(edge.source);
          if (parentNode) {
            if (parentNode.data.isContext) {
              if (!contextNodes.find(n => n.id === parentNode.id)) {
                contextNodes.push(parentNode);
              }
            }
            traverseUp(parentNode.id, new Set(path));
          }
        }
      });
    };

    traverseUp(processNodeId);

    // 3. 同じcontext内のノードを取得
    const processNode = nodeMap.get(processNodeId);
    if (processNode && processNode.data.contextId) {
      const contextId = processNode.data.contextId;
      nodes.forEach(node => {
        if (node.id !== processNodeId && 
            node.data.contextId === contextId &&
            !relatedNodes.find(n => n.id === node.id)) {
          relatedNodes.push(node);
        }
      });
    }

    // 4. contains, appearsIn, influencesエッジを辿る
    const findRelatedByEdges = (nodeId: string) => {
      edges.forEach(edge => {
        if (edge.source === nodeId || edge.target === nodeId) {
          const edgeData = edge.data as any;
          const edgeType = edgeData?.edgeType || '';
          
          if (['contains', 'appearsIn', 'influences'].includes(edgeType)) {
            const relatedNodeId = edge.source === nodeId ? edge.target : edge.source;
            const relatedNode = nodeMap.get(relatedNodeId);
            if (relatedNode && 
                relatedNode.id !== processNodeId &&
                !relatedNodes.find(n => n.id === relatedNode.id)) {
              relatedNodes.push(relatedNode);
            }
          }
        }
      });
    };

    findRelatedByEdges(processNodeId);

    // 5. inputNodesで指定されたノードを取得
    if (processNode && processNode.data.properties?.inputNodes) {
      const inputNodeIds = processNode.data.properties.inputNodes as string[];
      inputNodeIds.forEach(inputNodeId => {
        const inputNode = nodeMap.get(inputNodeId);
        if (inputNode && !relatedNodes.find(n => n.id === inputNode.id)) {
          relatedNodes.push(inputNode);
        }
      });
    }

    // Contextデータを構築
    const contextData: Record<string, any> = {};
    contextNodes.forEach(contextNode => {
      contextData[contextNode.id] = {
        label: contextNode.data.label,
        properties: contextNode.data.properties,
        jsonld: contextNode.data.jsonld,
        contextData: contextNode.data.contextData,
      };
    });

    return {
      contextNodes,
      relatedNodes,
      contextData,
    };
  }, []);

  /**
   * Contextとノードからプロンプトを構築
   */
  const buildContextPrompt = useCallback((
    processNode: Node<GraphNodeData>,
    context: ProcessContext,
    promptTemplate: string
  ): string => {
    let prompt = promptTemplate;

    // Context情報を挿入
    const contextInfo = context.contextNodes.map(ctx => {
      return `Context: ${ctx.data.label}\n${JSON.stringify(ctx.data.properties, null, 2)}`;
    }).join('\n\n');

    // 関連ノード情報を挿入
    const relatedInfo = context.relatedNodes.map(node => {
      const nodeType = node.data.nodeType || 'unknown';
      return `Node [${nodeType}]: ${node.data.label}\n${JSON.stringify(node.data.properties, null, 2)}`;
    }).join('\n\n');

    // テンプレート変数を置換
    prompt = prompt.replace(/\{\{context\}\}/g, contextInfo);
    prompt = prompt.replace(/\{\{relatedNodes\}\}/g, relatedInfo);
    prompt = prompt.replace(/\{\{processLabel\}\}/g, processNode.data.label);
    prompt = prompt.replace(/\{\{processProperties\}\}/g, JSON.stringify(processNode.data.properties, null, 2));

    return prompt;
  }, []);

  return {
    getProcessContext,
    buildContextPrompt,
  };
}

