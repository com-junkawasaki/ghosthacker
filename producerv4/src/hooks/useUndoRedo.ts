/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/undo-redo-hook
 * 
 * Undo/Redo hook for Konva stage
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Stage as KonvaStageType } from 'konva';

export function useUndoRedo(stageRef: React.RefObject<KonvaStageType> | null) {
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isRestoringRef = useRef(false);

  const saveState = useCallback(() => {
    if (isRestoringRef.current) return;
    if (!stageRef?.current) return;

    const state = stageRef.current.toJSON();
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex((prevIndex) => Math.max(0, prevIndex - 1));
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= 50 ? 49 : newIndex;
    });
  }, [stageRef, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0 || !stageRef?.current || typeof window === 'undefined') return;

    isRestoringRef.current = true;
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    if (state) {
      const stage = stageRef.current;
      const layers = stage.getLayers();
      layers.forEach((layer) => layer.destroy());
      stage.destroy();
      // Dynamically import Konva to avoid SSR issues
      if (typeof window !== 'undefined') {
        import('konva').then((KonvaModule) => {
          const Konva = KonvaModule.default;
          const newStage = Konva.Stage.create(state);
          Object.assign(stage, newStage);
          setHistoryIndex(newIndex);
        });
      }
    }
    isRestoringRef.current = false;
  }, [stageRef, history, historyIndex]);

  const redo = useCallback(async () => {
    if (historyIndex >= history.length - 1 || !stageRef?.current || typeof window === 'undefined') return;

    isRestoringRef.current = true;
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    if (state) {
      const stage = stageRef.current;
      const layers = stage.getLayers();
      layers.forEach((layer) => layer.destroy());
      stage.destroy();
      // Dynamically import Konva to avoid SSR issues
      const KonvaModule = await import('konva');
      const Konva = KonvaModule.default;
      const newStage = Konva.Stage.create(state);
      Object.assign(stage, newStage);
      setHistoryIndex(newIndex);
    }
    isRestoringRef.current = false;
  }, [stageRef, history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Initialize history on mount
  useEffect(() => {
    if (stageRef?.current && history.length === 0) {
      const state = stageRef.current.toJSON();
      setHistory([state]);
      setHistoryIndex(0);
    }
  }, [stageRef, history.length]);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

