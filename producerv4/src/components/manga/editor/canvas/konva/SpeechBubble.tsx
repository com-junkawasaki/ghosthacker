/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/speech-bubble
 * 
 * Speech bubble component for Konva
 */
'use client';

import { Group, Text, Path, Circle } from 'react-konva';
import { useRef } from 'react';

interface SpeechBubbleProps {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  speaker?: string;
  bubbleType: 'speech' | 'thought' | 'shout';
  fontSize?: number;
  fontFamily?: string;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (x: number, y: number) => void;
}

export function SpeechBubble({
  id,
  x,
  y,
  width,
  height,
  text,
  speaker,
  bubbleType,
  fontSize = 16,
  fontFamily = 'sans-serif',
  draggable = true,
  onClick,
  onDragEnd,
}: SpeechBubbleProps) {
  const groupRef = useRef<any>(null);

  // Generate bubble path based on type
  const getBubblePath = () => {
    const padding = 8;
    switch (bubbleType) {
      case 'speech':
        // Standard speech bubble with tail
        return `M ${padding} ${padding} 
                L ${width - padding} ${padding} 
                Q ${width} ${padding} ${width} ${padding + 5}
                L ${width} ${height - padding - 10}
                Q ${width} ${height - padding} ${width - 5} ${height - padding}
                L ${padding + 20} ${height - padding}
                L ${padding + 10} ${height - padding + 10}
                L ${padding} ${height - padding}
                Q ${padding} ${height - padding - 5} ${padding} ${height - padding - 10}
                L ${padding} ${padding + 5}
                Q ${padding} ${padding} ${padding + 5} ${padding}
                Z`;
      case 'thought':
        // Thought bubble with circles
        return `M ${padding} ${padding} 
                L ${width - padding} ${padding} 
                Q ${width} ${padding} ${width} ${padding + 5}
                L ${width} ${height - padding - 5}
                Q ${width} ${height - padding} ${width - 5} ${height - padding}
                L ${padding + 5} ${height - padding}
                Q ${padding} ${height - padding} ${padding} ${height - padding - 5}
                L ${padding} ${padding + 5}
                Q ${padding} ${padding} ${padding + 5} ${padding}
                Z`;
      case 'shout':
        // Shout bubble with jagged edges
        return `M ${padding} ${padding} 
                L ${width - padding} ${padding} 
                L ${width} ${height - padding}
                L ${padding} ${height - padding}
                Z`;
      default:
        return `M ${padding} ${padding} 
                L ${width - padding} ${padding} 
                L ${width - padding} ${height - padding} 
                L ${padding} ${height - padding} 
                Z`;
    }
  };

  const handleDragEnd = () => {
    if (groupRef.current && onDragEnd) {
      const pos = groupRef.current.position();
      onDragEnd(pos.x, pos.y);
    }
  };

  return (
    <Group
      ref={groupRef}
      id={id}
      x={x}
      y={y}
      draggable={draggable}
      onClick={onClick}
      onDragEnd={handleDragEnd}
    >
      <Path
        data={getBubblePath()}
        fill="white"
        stroke="black"
        strokeWidth={2}
      />
      {bubbleType === 'thought' && (
        <>
          <Circle x={width - 10} y={height - 5} radius={3} fill="black" />
          <Circle x={width - 5} y={height + 2} radius={2} fill="black" />
          <Circle x={width - 2} y={height + 5} radius={1.5} fill="black" />
        </>
      )}
      {bubbleType === 'speech' && (
        <Path
          data={`M ${width - 30} ${height - 8} L ${width - 20} ${height} L ${width - 10} ${height - 8}`}
          stroke="black"
          strokeWidth={2}
          fill="white"
        />
      )}
      <Text
        x={8}
        y={8}
        width={width - 16}
        height={height - 16}
        text={text}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill="black"
        align="left"
        verticalAlign="top"
        wrap="word"
      />
      {speaker && (
        <Text
          x={8}
          y={-20}
          text={speaker}
          fontSize={fontSize - 2}
          fontFamily={fontFamily}
          fill="black"
          fontStyle="bold"
        />
      )}
    </Group>
  );
}

