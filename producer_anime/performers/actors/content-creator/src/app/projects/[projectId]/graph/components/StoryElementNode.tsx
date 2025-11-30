/**
 * Story Element Node Component for React Flow
 * ストーリー要素ノードを各タイプに応じた形状と色で表示
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GraphNodeData, NODE_TYPE_COLORS, StoryElementNodeType } from './types';
import ProcessNode from './ProcessNode';

interface StoryElementNodeData extends GraphNodeData {
  nodeType?: StoryElementNodeType;
}

function StoryElementNode({ id, type, data, selected, zIndex, isConnectable, xPos, yPos, dragHandle, dragging, targetPosition, sourcePosition }: NodeProps<StoryElementNodeData>) {
  const { label, nodeType, isContext } = data;
  const radius = 25;
  const size = 50;

  // Context node (hexagon) - keep existing behavior
  if (isContext) {
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
      <div className="story-element-node context-node-wrapper">
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

  // Story element nodes based on type
  const color = nodeType ? NODE_TYPE_COLORS[nodeType] : '#6366f1';
  const selectedColor = nodeType ? NODE_TYPE_COLORS[nodeType] : '#3b82f6';
  const strokeColor = selected ? selectedColor : color;

  // Worldview/Background: Hexagon
  if (nodeType === 'worldview' || nodeType === 'background') {
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
      <div className="story-element-node">
        <svg width={size} height={size} className="story-element-svg">
          <defs>
            <filter id={`shadow-${nodeType}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <path
              d={pathData}
              fill={color}
              stroke={strokeColor}
              strokeWidth={selected ? 4 : 3}
              filter={`url(#shadow-${nodeType})`}
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="14"
              fontWeight="bold"
            >
              {nodeType === 'worldview' ? '🌍' : '📖'}
            </text>
          </g>
        </svg>
        <div className="story-element-label">
          {label.substring(0, 12)}
        </div>
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

  // Timeline: Rectangle
  if (nodeType === 'timeline') {
    const width = size * 1.2;
    const height = size * 0.8;

    return (
      <div className="story-element-node">
        <svg width={width} height={height} className="story-element-svg">
          <defs>
            <filter id="shadow-timeline" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <rect
            x="2"
            y="2"
            width={width - 4}
            height={height - 4}
            fill={color}
            stroke={strokeColor}
            strokeWidth={selected ? 4 : 3}
            rx="4"
            filter="url(#shadow-timeline)"
          />
          <text
            x={width / 2}
            y={height / 2 + 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="14"
            fontWeight="bold"
          >
            ⏱️
          </text>
        </svg>
        <div className="story-element-label">
          {label.substring(0, 12)}
        </div>
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

  // Beat/Scene: Square
  if (nodeType === 'beat' || nodeType === 'scene') {
    return (
      <div className="story-element-node">
        <svg width={size} height={size} className="story-element-svg">
          <defs>
            <filter id={`shadow-${nodeType}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <rect
            x="2"
            y="2"
            width={size - 4}
            height={size - 4}
            fill={color}
            stroke={strokeColor}
            strokeWidth={selected ? 4 : 3}
            rx="4"
            filter={`url(#shadow-${nodeType})`}
          />
          <text
            x={size / 2}
            y={size / 2 + 4}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="14"
            fontWeight="bold"
          >
            {nodeType === 'beat' ? '🎬' : '🎭'}
          </text>
        </svg>
        <div className="story-element-label">
          {label.substring(0, 12)}
        </div>
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

  // Character: Circle
  if (nodeType === 'character') {
    return (
      <div className="story-element-node">
        <div
          className={`story-element-circle ${selected ? 'selected' : ''}`}
          style={{
            backgroundColor: color,
            borderColor: strokeColor,
            borderWidth: selected ? 4 : 3,
          }}
        >
          👤
        </div>
        <div className="story-element-label">
          {label.substring(0, 12)}
        </div>
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

  // Event: Diamond
  if (nodeType === 'event') {
    const points = [
      { x: size / 2, y: 2 },
      { x: size - 2, y: size / 2 },
      { x: size / 2, y: size - 2 },
      { x: 2, y: size / 2 },
    ];

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ') + ' Z';

    return (
      <div className="story-element-node">
        <svg width={size} height={size} className="story-element-svg">
          <defs>
            <filter id="shadow-event" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <g transform={`translate(0, 0)`}>
            <path
              d={pathData}
              fill={color}
              stroke={strokeColor}
              strokeWidth={selected ? 4 : 3}
              filter="url(#shadow-event)"
            />
            <text
              x={size / 2}
              y={size / 2 + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="14"
              fontWeight="bold"
            >
              ⚡
            </text>
          </g>
        </svg>
        <div className="story-element-label">
          {label.substring(0, 12)}
        </div>
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

  // Process: Octagon (use ProcessNode component)
  if (nodeType === 'process') {
    return <ProcessNode id={id} type={type} data={data as any} selected={selected} zIndex={zIndex} isConnectable={isConnectable} xPos={xPos} yPos={yPos} dragging={dragging} {...(dragHandle && { dragHandle })} {...(targetPosition && { targetPosition })} {...(sourcePosition && { sourcePosition })} />;
  }

  // Default node (circle) - fallback
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

export default memo(StoryElementNode);

