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
  canUndo?: boolean;
  canRedo?: boolean;
}

export function UndoRedo({ onUndo, onRedo, canUndo = false, canRedo = false }: UndoRedoProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 ${
          canUndo ? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'
        }`}
        title="元に戻す"
      >
        <span className="text-lg">↶</span>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 ${
          canRedo ? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'
        }`}
        title="やり直す"
      >
        <span className="text-lg">↷</span>
      </button>
    </div>
  );
}

