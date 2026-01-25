/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/continue-from-previous-toggle
 * 
 * Continue from previous page toggle component
 */
'use client';

import { Toggle } from '@/components/shared/ui/Toggle';

interface ContinueFromPreviousToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ContinueFromPreviousToggle({
  checked,
  onChange,
}: ContinueFromPreviousToggleProps) {
  return <Toggle checked={checked} onChange={onChange} label="前のページから続ける" />;
}

