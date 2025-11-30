/**
 * Process Generation API Route
 * Processノードの実行エンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { graphQuery, getGraphNode, updateGraphNode } from '@/internal/grpc/services/graph_client';
import { generateDocument, generateImage } from '@/internal/services/llmGeneration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { generationType, options } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Process node ID is required' },
        { status: 400 }
      );
    }

    // Processノードを取得
    const processNode = await getGraphNode(id);
    if (!processNode) {
      return NextResponse.json(
        { error: 'Process node not found' },
        { status: 404 }
      );
    }

    const properties = typeof processNode.properties === 'string'
      ? JSON.parse(processNode.properties)
      : processNode.properties || {};

    const nodeType = properties.nodeType || properties.generationType || generationType;
    if (nodeType !== 'process') {
      return NextResponse.json(
        { error: 'Node is not a process node' },
        { status: 400 }
      );
    }

    // 実行状態を更新
    await updateGraphNode(
      id,
      processNode.label,
      {
        ...properties,
        executionStatus: 'running',
        lastExecutionTime: new Date().toISOString(),
      },
      {}
    );

    try {
      // Contextと関連ノードを取得
      const nodesQuery = 'SELECT id, label, properties, jsonld FROM graph_nodes LIMIT 100';
      const edgesQuery = 'SELECT id, source_id, target_id, label, properties FROM graph_edges LIMIT 200';
      
      const [nodesResult, edgesResult] = await Promise.all([
        graphQuery(nodesQuery),
        graphQuery(edgesQuery),
      ]);

      // ノードとエッジをパース
      const allNodes: any[] = Array.isArray(nodesResult) ? nodesResult : [];
      const allEdges: any[] = Array.isArray(edgesResult) ? edgesResult : [];

      // ノードをパース
      const parsedNodes = allNodes.map((row: any) => {
        const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
        const jsonld = typeof row.jsonld === 'string' ? JSON.parse(row.jsonld) : (row.jsonld || {});
        return {
          id: row.id,
          data: {
            label: row.label || '',
            properties: props,
            jsonld,
            isContext: jsonld['@type'] === 'gh:Context' || props.isContext === true,
            contextId: props.contextId,
          },
        };
      });

      // エッジをパース
      const parsedEdges = allEdges.map((row: any) => {
        const edgeProps = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
        return {
          id: row.id,
          source: row.source_id,
          target: row.target_id,
          label: row.label || '',
          data: {
            edgeType: edgeProps.edgeType || 'relatesTo',
            properties: edgeProps,
          },
        };
      });

      // Context取得ロジック
      const contextNodes: any[] = [];
      const relatedNodes: any[] = [];
      const visited = new Set<string>();
      const nodeMap = new Map(parsedNodes.map(n => [n.id, n]));

      // 1. 直接接続されたbelongsToエッジを辿る
      const findDirectContexts = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        parsedEdges.forEach(edge => {
          if (edge.target === nodeId) {
            const sourceNode = nodeMap.get(edge.source);
            if (sourceNode && sourceNode.data.isContext) {
              if (!contextNodes.find(n => n.id === sourceNode.id)) {
                contextNodes.push(sourceNode);
              }
              findDirectContexts(sourceNode.id);
            }
          }
        });
      };

      findDirectContexts(id);

      // 2. グラフトラバーサルで階層を遡る
      const traverseUp = (nodeId: string, path: Set<string> = new Set()) => {
        if (path.has(nodeId)) return;
        path.add(nodeId);

        parsedEdges.forEach(edge => {
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

      traverseUp(id);

      // 3. 同じcontext内のノードを取得
      const processNode = nodeMap.get(id);
      if (processNode && processNode.data.contextId) {
        const contextId = processNode.data.contextId;
        parsedNodes.forEach(node => {
          if (node.id !== id && 
              node.data.contextId === contextId &&
              !relatedNodes.find(n => n.id === node.id)) {
            relatedNodes.push(node);
          }
        });
      }

      // 4. contains, appearsIn, influencesエッジを辿る
      parsedEdges.forEach(edge => {
        if (edge.source === id || edge.target === id) {
          const edgeType = edge.data?.edgeType || '';
          if (['contains', 'appearsIn', 'influences'].includes(edgeType)) {
            const relatedNodeId = edge.source === id ? edge.target : edge.source;
            const relatedNode = nodeMap.get(relatedNodeId);
            if (relatedNode && 
                relatedNode.id !== id &&
                !relatedNodes.find(n => n.id === relatedNode.id)) {
              relatedNodes.push(relatedNode);
            }
          }
        }
      });

      // 5. inputNodesで指定されたノードを取得
      if (properties.inputNodes && Array.isArray(properties.inputNodes)) {
        properties.inputNodes.forEach((inputNodeId: string) => {
          const inputNode = nodeMap.get(inputNodeId);
          if (inputNode && !relatedNodes.find(n => n.id === inputNode.id)) {
            relatedNodes.push(inputNode);
          }
        });
      }

      // プロンプトを構築
      const promptTemplate = properties.promptTemplate || 'Generate content based on the following context:\n\n{{context}}\n\nRelated nodes:\n{{relatedNodes}}';
      let prompt = promptTemplate;
      
      const contextInfo = contextNodes.map((ctx: any) => {
        return `Context: ${ctx.data.label}\n${JSON.stringify(ctx.data.properties || {}, null, 2)}`;
      }).join('\n\n');

      const relatedInfo = relatedNodes.map((node: any) => {
        const nodeType = node.data.properties?.nodeType || 'unknown';
        return `Node [${nodeType}]: ${node.data.label}\n${JSON.stringify(node.data.properties || {}, null, 2)}`;
      }).join('\n\n');

      prompt = prompt.replace(/\{\{context\}\}/g, contextInfo);
      prompt = prompt.replace(/\{\{relatedNodes\}\}/g, relatedInfo);
      prompt = prompt.replace(/\{\{processLabel\}\}/g, processNode.label);
      prompt = prompt.replace(/\{\{processProperties\}\}/g, JSON.stringify(properties, null, 2));

      // 生成実行
      const generationType = properties.generationType || 'document';
      let result: any = {};

      if (generationType === 'document') {
        const docResult = await generateDocument({
          provider: properties.llmProvider || 'openai',
          modelId: properties.modelId || 'gpt-4',
          prompt,
          maxTokens: options?.maxTokens || 2000,
          temperature: options?.temperature || 0.7,
        });

        if (docResult.success && docResult.content) {
          result = {
            success: true,
            content: docResult.content,
            type: 'document',
          };
        } else {
          throw new Error(docResult.error || 'Document generation failed');
        }
      } else if (generationType === 'image') {
        const imgResult = await generateImage({
          provider: properties.llmProvider || 'openai',
          modelId: properties.modelId || 'dall-e-3',
          prompt,
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          style: options?.style || 'vivid',
        });

        if (imgResult.success && (imgResult.imageUrl || imgResult.imageBase64)) {
          result = {
            success: true,
            imageUrl: imgResult.imageUrl,
            imageBase64: imgResult.imageBase64,
            type: 'image',
          };
        } else {
          throw new Error(imgResult.error || 'Image generation failed');
        }
      }

      // 結果を保存
      await updateGraphNode(
        id,
        processNode.label,
        {
          ...properties,
          executionStatus: 'completed',
          lastExecutionTime: new Date().toISOString(),
          lastExecutionResult: JSON.stringify(result),
          generatedContent: generationType === 'document' 
            ? result.content 
            : (result.imageBase64 || result.imageUrl),
        },
        {}
      );

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error: any) {
      // エラー状態を保存
      await updateGraphNode(
        id,
        processNode.label,
        {
          ...properties,
          executionStatus: 'error',
          lastExecutionTime: new Date().toISOString(),
          lastExecutionResult: JSON.stringify({ error: error.message }),
        },
        {}
      );

      return NextResponse.json(
        { error: error.message || 'Generation failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

