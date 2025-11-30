/**
 * Custom Context Node Component for React Flow
 * Contextノードを六角形で表示するカスタムノード
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ContextNodeData {
  label: string;
  isContext: boolean;
  contextData?: {
    version?: number;
    prefixes?: Record<string, string>;
  };
  properties: Record<string, any>;
}

function ContextNode({ data, selected }: NodeProps<ContextNodeData>) {
  const { label, isContext } = data;
  const radius = 25;

  if (isContext) {
    // 六角形のcontextノード
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    });

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ') + ' Z';

    return (
      <div className="context-node-wrapper">
        <svg width={radius * 2 + 10} height={radius * 2 + 10} className="context-node-svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <g transform={`translate(${radius + 5}, ${radius + 5})`}>
            <path
              d={pathData}
              fill={selected ? '#f59e0b' : '#f59e0b'}
              stroke={selected ? '#d97706' : '#d97706'}
              strokeWidth={selected ? 4 : 3}
              filter="url(#shadow)"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="16"
              fontWeight="bold"
              className="context-icon"
            >
              @
            </text>
          </g>
        </svg>
        <div className="context-node-label">
          {label.substring(0, 12)}
        </div>
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#f59e0b' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#f59e0b' }}
        />
      </div>
    );
  }

  // 通常のノード（円形）
  return (
    <div className={`default-node ${selected ? 'selected' : ''}`}>
      <div className="default-node-circle">
        {label.substring(0, 8)}
      </div>
      <div className="default-node-label">
        {label.substring(0, 12)}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#6366f1', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#6366f1', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(ContextNode);

