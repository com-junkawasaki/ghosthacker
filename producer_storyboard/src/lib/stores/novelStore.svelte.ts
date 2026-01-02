/**
 * Novel Store - State management for the novel editor
 * Based on composerStore pattern
 */

import type { Chapter } from '../grpc/generated/novel/v1/chapter_pb';
import type { NovelProject as NovelProjectType } from '../grpc/generated/novel/v1/novel_pb';

export interface NovelState {
	projectId: string | null;
	novelProject: NovelProjectType | null;
	selectedChapterId: string | null;
	chapters: Chapter[];
	editorContent: string; // HTML content from Tiptap
	isDirty: boolean;
	saveStatus: 'idle' | 'saving' | 'saved' | 'error';
	saveError: string | null;
	showGraphPanel: boolean;
}

interface HistoryEntry {
	content: string;
	description: string;
}

// Create a simple reactive store
function createNovelStore() {
	const state = $state<NovelState>({
		projectId: null,
		novelProject: null,
		selectedChapterId: null,
		chapters: [],
		editorContent: '',
		isDirty: false,
		saveStatus: 'idle',
		saveError: null,
		showGraphPanel: true,
	});

	let history = $state<HistoryEntry[]>([]);
	let historyIndex = $state(-1);
	const maxHistorySize = 50;

	// Save state to history for undo/redo
	function saveToHistory(description: string) {
		// Remove any future history if we're not at the end
		if (historyIndex < history.length - 1) {
			history = history.slice(0, historyIndex + 1);
		}

		// Add new entry
		history = [...history, {
			content: state.editorContent,
			description,
		}];

		// Limit history size
		if (history.length > maxHistorySize) {
			history = history.slice(history.length - maxHistorySize);
		}

		historyIndex = history.length - 1;
	}

	return {
		get state() {
			return state;
		},

		get canUndo() {
			return historyIndex > 0;
		},

		get canRedo() {
			return historyIndex < history.length - 1;
		},

		get selectedChapter(): Chapter | null {
			if (!state.selectedChapterId) return null;
			return state.chapters.find(c => c.id === state.selectedChapterId) || null;
		},

		// Initialize novel editor
		initialize(projectId: string, novelProject: NovelProjectType | null = null) {
			state.projectId = projectId;
			state.novelProject = novelProject;
			state.selectedChapterId = null;
			state.chapters = [];
			state.editorContent = '';
			state.isDirty = false;
			state.saveStatus = 'idle';
			state.saveError = null;

			// Clear history
			history = [{
				content: '',
				description: 'Initial state',
			}];
			historyIndex = 0;
		},

		// Set novel project
		setNovelProject(novelProject: NovelProjectType) {
			state.novelProject = novelProject;
		},

		// Set chapters
		setChapters(chapters: Chapter[]) {
			state.chapters = [...chapters].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
		},

		// Select chapter
		selectChapter(chapterId: string | null) {
			state.selectedChapterId = chapterId;
			state.isDirty = false;
		},

		// Set editor content
		setEditorContent(content: string) {
			state.editorContent = content;
			state.isDirty = true;
		},

		// Mark as saved
		markSaved() {
			state.isDirty = false;
			state.saveStatus = 'saved';
			state.saveError = null;
		},

		// Mark as saving
		markSaving() {
			state.saveStatus = 'saving';
			state.saveError = null;
		},

		// Mark save error
		markSaveError(error: string) {
			state.saveStatus = 'error';
			state.saveError = error;
		},

		// Reset save status
		resetSaveStatus() {
			state.saveStatus = 'idle';
			state.saveError = null;
		},

		// Toggle graph panel
		toggleGraphPanel() {
			state.showGraphPanel = !state.showGraphPanel;
		},

		setShowGraphPanel(show: boolean) {
			state.showGraphPanel = show;
		},

		// Undo/Redo
		undo() {
			if (historyIndex > 0) {
				historyIndex--;
				const entry = history[historyIndex];
				if (entry) {
					state.editorContent = entry.content;
					state.isDirty = true;
				}
			}
		},

		redo() {
			if (historyIndex < history.length - 1) {
				historyIndex++;
				const entry = history[historyIndex];
				if (entry) {
					state.editorContent = entry.content;
					state.isDirty = true;
				}
			}
		},

		// Save to history (for manual history tracking)
		saveToHistory(description: string) {
			saveToHistory(description);
		},

		// Get chapter by ID
		getChapter(chapterId: string): Chapter | null {
			return state.chapters.find(c => c.id === chapterId) || null;
		},
	};
}

// Export singleton instance
export const novelStore = createNovelStore();
