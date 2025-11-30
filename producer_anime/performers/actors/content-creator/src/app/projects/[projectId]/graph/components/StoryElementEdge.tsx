/**
 * Story Element Edge Component for React Flow
 * ストーリー要素間の関係をエッジタイプに応じた色とスタイルで表示
 */

import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';
import { StoryElementEdgeType, EDGE_TYPE_COLORS } from './types';

interface StoryElementEdgeData {
  edgeType?: StoryElementEdgeType;
  label?: string;
}

function StoryElementEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps<StoryElementEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType = data?.edgeType || 'relatesTo';
  const color = EDGE_TYPE_COLORS[edgeType] || '#6b7280';
  
  // Determine stroke style based on edge type
  let strokeDasharray: string | undefined;
  let strokeWidth = style.strokeWidth || 2;
  
  switch (edgeType) {
    case 'contains':
    case 'belongsTo':
      strokeDasharray = '8,4';
      strokeWidth = 2.5;
      break;
    case 'precedes':
      strokeDasharray = '4,4';
      strokeWidth = 2;
      break;
    case 'causes':
      strokeWidth = 3;
      break;
    case 'conflictsWith':
      strokeDasharray = '6,2,2,2';
      strokeWidth = 2.5;
      break;
    default:
      strokeDasharray = undefined;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...(markerEnd && { markerEnd })}
        style={{
          ...style,
          stroke: color,
          strokeWidth,
          strokeDasharray,
        }}
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          fill={color}
          fontSize="10"
          fontWeight="500"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          {data.label}
        </text>
      )}
    </>
  );
}

export default StoryElementEdge;

