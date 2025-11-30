/**
 * Process Node Component for React Flow
 * Processノードを八角形で表示し、実行状態を視覚化
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GraphNodeData, NODE_TYPE_COLORS, ProcessNodeProperties } from './types';

interface ProcessNodeData extends GraphNodeData {
  nodeType: 'process';
  properties: ProcessNodeProperties;
}

function ProcessNode({ data, selected }: NodeProps<ProcessNodeData>) {
  const { label, properties } = data;
  const size = 50;
  const color = NODE_TYPE_COLORS.process;
  const strokeColor = selected ? '#7c3aed' : color;
  const executionStatus = properties.executionStatus || 'idle';
  const generationType = properties.generationType || 'document';

  // 八角形のポイントを計算
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    return {
      x: (size / 2) + (size / 2 - 5) * Math.cos(angle),
      y: (size / 2) + (size / 2 - 5) * Math.sin(angle),
    };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  // 実行状態に応じた色
  let statusColor = color;
  if (executionStatus === 'running') {
    statusColor = '#3b82f6'; // blue
  } else if (executionStatus === 'completed') {
    statusColor = '#22c55e'; // green
  } else if (executionStatus === 'error') {
    statusColor = '#ef4444'; // red
  }

  return (
    <div className="story-element-node process-node">
      <svg width={size} height={size} className="story-element-svg">
        <defs>
          <filter id="shadow-process" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
          {executionStatus === 'running' && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 25 25;360 25 25"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </defs>
        <g>
          <path
            d={pathData}
            fill={statusColor}
            stroke={strokeColor}
            strokeWidth={selected ? 4 : 3}
            filter="url(#shadow-process)"
          />
          <text
            x={size / 2}
            y={size / 2 + 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="16"
            fontWeight="bold"
          >
            {generationType === 'document' ? '📄' : '🖼️'}
          </text>
          {executionStatus === 'running' && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 8}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 25 25;360 25 25"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      </svg>
      <div className="story-element-label">
        {label.substring(0, 12)}
      </div>
      {executionStatus !== 'idle' && (
        <div className="process-status-indicator" style={{ backgroundColor: statusColor }}>
          {executionStatus === 'running' ? '実行中' : executionStatus === 'completed' ? '完了' : 'エラー'}
        </div>
      )}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(ProcessNode);

