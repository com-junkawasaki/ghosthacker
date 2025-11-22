/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-image
 * 
 * Panel image component for Konva
 */
'use client';

import { useEffect, useState } from 'react';
import { Image } from 'react-konva';

interface PanelImageProps {
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
}

export function PanelImage({ x, y, width, height, imageUrl }: PanelImageProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };
  }, [imageUrl]);

  if (!image) {
    return null;
  }

  return <Image x={x} y={y} width={width} height={height} image={image} />;
}

