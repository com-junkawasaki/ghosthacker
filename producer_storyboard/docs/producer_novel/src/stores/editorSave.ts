/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/editor-save-store
 * 
 * Editor save state management using Zustand
 */
import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorSaveStore {
  status: SaveStatus;
  error: string | null;
  setSaving: () => void;
  setSaved: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useEditorSaveStore = create<EditorSaveStore>((set) => ({
  status: 'idle',
  error: null,
  setSaving: () => set({ status: 'saving', error: null }),
  setSaved: () => set({ status: 'saved', error: null }),
  setError: (error: string) => set({ status: 'error', error }),
  reset: () => set({ status: 'idle', error: null }),
}));

