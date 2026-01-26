/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/bottom-toolbar
 * 
 * Bottom toolbar component with editing tools
 */
'use client';

import { EditingTools } from './EditingTools';
import { UndoRedo } from './UndoRedo';

interface BottomToolbarProps {
  selectedTool?: string;
  onToolSelect?: (tool: string) => void;
}

export function BottomToolbar({ selectedTool, onToolSelect }: BottomToolbarProps) {
  return (
    <div className="h-16 bg-gray-200 border-t border-gray-300 flex items-center justify-between px-4">
      <EditingTools selectedTool={selectedTool} onToolSelect={onToolSelect} />
      <UndoRedo />
    </div>
  );
}

