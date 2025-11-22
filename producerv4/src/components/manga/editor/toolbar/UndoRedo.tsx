/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/undo-redo
 * 
 * Undo/Redo component
 */
'use client';

interface UndoRedoProps {
  onUndo?: () => void;
  onRedo?: () => void;
}

export function UndoRedo({ onUndo, onRedo }: UndoRedoProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUndo}
        className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
        title="元に戻す"
      >
        <span className="text-lg">↶</span>
      </button>
      <button
        onClick={onRedo}
        className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700"
        title="やり直す"
      >
        <span className="text-lg">↷</span>
      </button>
    </div>
  );
}

