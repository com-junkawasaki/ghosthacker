/**
 * Custom Context Edge Component for React Flow
 * Context関係を点線で表示するカスタムエッジ
 */

import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

function ContextEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: style.stroke || '#9ca3af',
          strokeWidth: style.strokeWidth || 2,
          strokeDasharray: '5,5',
        }}
      />
    </>
  );
}

export default ContextEdge;

