/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/credit-display
 * 
 * Credit display component
 */
'use client';

interface CreditDisplayProps {
  credits: number;
}

export function CreditDisplay({ credits }: CreditDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">💎</span>
      <span className="text-lg font-semibold">{credits.toLocaleString()}</span>
    </div>
  );
}

