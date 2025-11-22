/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/speech-bubble
 * 
 * Speech bubble component for Konva
 */
'use client';

import { Group, Text, Path } from 'react-konva';

interface SpeechBubbleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  speaker?: string;
  bubbleType: 'speech' | 'thought' | 'shout';
  fontSize?: number;
  fontFamily?: string;
}

export function SpeechBubble({
  x,
  y,
  width,
  height,
  text,
  speaker,
  bubbleType,
  fontSize = 16,
  fontFamily = 'sans-serif',
}: SpeechBubbleProps) {
  // Generate bubble path based on type
  const getBubblePath = () => {
    switch (bubbleType) {
      case 'speech':
        // Standard speech bubble with tail
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x + 10} ${y + height} L ${x} ${y + height - 10} Z`;
      case 'thought':
        // Thought bubble with circles
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      case 'shout':
        // Shout bubble with jagged edges
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      default:
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
    }
  };

  return (
    <Group>
      <Path
        data={getBubblePath()}
        fill="white"
        stroke="black"
        strokeWidth={2}
      />
      <Text
        x={x + 8}
        y={y + 8}
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
          x={x + 8}
          y={y - 20}
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

