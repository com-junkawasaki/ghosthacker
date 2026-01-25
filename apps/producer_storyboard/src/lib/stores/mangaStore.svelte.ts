/**
 * Manga Store - State management for the manga editor
 * Based on composerStore pattern
 */

import type { Page } from '../grpc/generated/manga/v1/page_pb';
import type { Panel } from '../grpc/generated/manga/v1/panel_pb';
import type { SpeechBubble } from '../grpc/generated/manga/v1/speech_bubble_pb';
import type { MangaProject } from '../grpc/generated/manga/v1/manga_pb';

export type ToolType = 'select' | 'pen' | 'eraser' | 'shape' | 'text';

export interface MangaState {
	projectId: string | null;
	mangaProject: MangaProject | null;
	selectedPageId: string | null;
	selectedPanelId: string | null;
	selectedBubbleId: string | null;
	pages: Page[];
	panels: Panel[];
	speechBubbles: SpeechBubble[];
	selectedTool: ToolType;
	konvaStageJson: Record<string, unknown> | null;
	isDirty: boolean;
	saveStatus: 'idle' | 'saving' | 'saved' | 'error';
	saveError: string | null;
	zoom: number;
}

interface HistoryEntry {
	stageJson: Record<string, unknown>;
	description: string;
}

// Create a simple reactive store
function createMangaStore() {
	const state = $state<MangaState>({
		projectId: null,
		mangaProject: null,
		selectedPageId: null,
		selectedPanelId: null,
		selectedBubbleId: null,
		pages: [],
		panels: [],
		speechBubbles: [],
		selectedTool: 'select',
		konvaStageJson: null,
		isDirty: false,
		saveStatus: 'idle',
		saveError: null,
		zoom: 1,
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
			stageJson: state.konvaStageJson ? JSON.parse(JSON.stringify(state.konvaStageJson)) : {},
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

		get selectedPage(): Page | null {
			if (!state.selectedPageId) return null;
			return state.pages.find(p => p.id === state.selectedPageId) || null;
		},

		get selectedPanel(): Panel | null {
			if (!state.selectedPanelId) return null;
			return state.panels.find(p => p.id === state.selectedPanelId) || null;
		},

		get selectedBubble(): SpeechBubble | null {
			if (!state.selectedBubbleId) return null;
			return state.speechBubbles.find(b => b.id === state.selectedBubbleId) || null;
		},

		// Initialize manga editor
		initialize(projectId: string, mangaProject: MangaProject | null = null) {
			state.projectId = projectId;
			state.mangaProject = mangaProject;
			state.selectedPageId = null;
			state.selectedPanelId = null;
			state.selectedBubbleId = null;
			state.pages = [];
			state.panels = [];
			state.speechBubbles = [];
			state.selectedTool = 'select';
			state.konvaStageJson = null;
			state.isDirty = false;
			state.saveStatus = 'idle';
			state.saveError = null;
			state.zoom = 1;

			// Clear history
			history = [{
				stageJson: {},
				description: 'Initial state',
			}];
			historyIndex = 0;
		},

		// Set manga project
		setMangaProject(mangaProject: MangaProject) {
			state.mangaProject = mangaProject;
		},

		// Set pages
		setPages(pages: Page[]) {
			state.pages = [...pages].sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
		},

		// Set panels
		setPanels(panels: Panel[]) {
			state.panels = [...panels];
		},

		// Set speech bubbles
		setSpeechBubbles(bubbles: SpeechBubble[]) {
			state.speechBubbles = [...bubbles];
		},

		// Select page
		selectPage(pageId: string | null) {
			state.selectedPageId = pageId;
			state.selectedPanelId = null;
			state.selectedBubbleId = null;
			state.isDirty = false;
		},

		// Select panel
		selectPanel(panelId: string | null) {
			state.selectedPanelId = panelId;
			state.selectedBubbleId = null;
		},

		// Select bubble
		selectBubble(bubbleId: string | null) {
			state.selectedBubbleId = bubbleId;
		},

		// Set selected tool
		setSelectedTool(tool: ToolType) {
			state.selectedTool = tool;
		},

		// Set Konva stage JSON
		setKonvaStageJson(stageJson: Record<string, unknown> | null) {
			state.konvaStageJson = stageJson;
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

		// Set zoom
		setZoom(zoom: number) {
			state.zoom = Math.max(0.1, Math.min(zoom, 5));
		},

		// Undo/Redo
		undo() {
			if (historyIndex > 0) {
				historyIndex--;
				const entry = history[historyIndex];
				if (entry) {
					state.konvaStageJson = entry.stageJson;
					state.isDirty = true;
				}
			}
		},

		redo() {
			if (historyIndex < history.length - 1) {
				historyIndex++;
				const entry = history[historyIndex];
				if (entry) {
					state.konvaStageJson = entry.stageJson;
					state.isDirty = true;
				}
			}
		},

		// Save to history (for manual history tracking)
		saveToHistory(description: string) {
			saveToHistory(description);
		},

		// Get page by ID
		getPage(pageId: string): Page | null {
			return state.pages.find(p => p.id === pageId) || null;
		},

		// Get panel by ID
		getPanel(panelId: string): Panel | null {
			return state.panels.find(p => p.id === panelId) || null;
		},

		// Get bubble by ID
		getBubble(bubbleId: string): SpeechBubble | null {
			return state.speechBubbles.find(b => b.id === bubbleId) || null;
		},
	};
}

// Export singleton instance
export const mangaStore = createMangaStore();
