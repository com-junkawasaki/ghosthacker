/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-image
 * 
 * Panel image component for Konva
 */
'use client';

import { useEffect, useState } from 'react';

interface PanelImageProps {
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl?: string;
  imageData?: string; // Base64 encoded bytea data
}

export function PanelImage({ x, y, width, height, imageUrl, imageData }: PanelImageProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ImageComponent, setImageComponent] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-konva').then((mod) => {
        setImageComponent(() => mod.Image);
      });
    }
  }, []);

  useEffect(() => {
    if (!imageUrl && !imageData) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    // Prefer imageData (bytea) over imageUrl
    if (imageData) {
      img.src = `data:image/png;base64,${imageData}`;
    } else if (imageUrl) {
      img.src = imageUrl;
    }
    
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl || 'base64 data');
      setImage(null);
    };
  }, [imageUrl, imageData]);

  if (!image || !ImageComponent) {
    return null;
  }

  const ImageComp = ImageComponent;
  return <ImageComp x={x} y={y} width={width} height={height} image={image} />;
}

