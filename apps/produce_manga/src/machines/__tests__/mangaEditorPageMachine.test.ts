/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-editor-page-machine-test
 * 
 * Model-based tests for manga editor page machine
 * Tests page switching functionality with type safety
 * Uses XState v5 API directly (createActor, getSnapshot)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { mangaEditorPageMachine } from '../mangaEditorPageMachine';
import type { MangaEditorPageEvent } from '@/types/mangaMachine';
import type { MangaProject, MangaScript, MangaPage, MangaPanel } from '@/types/manga';

describe('MangaEditorPageMachine - Page Switching', () => {
  const mockProject: MangaProject = {
    id: 'test-project-1',
    title: 'Test Project',
    description: 'Test Description',
    createdAt: '2025-01-29T00:00:00Z',
    updatedAt: '2025-01-29T00:00:00Z',
  };

  const mockScript: MangaScript = {
    id: 'script-1',
    projectId: 'test-project-1',
    title: 'Test Script',
    pageCount: 2,
    createdAt: '2025-01-29T00:00:00Z',
    updatedAt: '2025-01-29T00:00:00Z',
  };

  const mockPages: MangaPage[] = [
    {
      id: 'page-1',
      projectId: 'test-project-1',
      scriptId: 'script-1',
      pageId: 'page_1',
      pageNumber: 1,
      width: 800,
      height: 1200,
      konvaStageJson: null,
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    },
    {
      id: 'page-2',
      projectId: 'test-project-1',
      scriptId: 'script-1',
      pageId: 'page_2',
      pageNumber: 2,
      width: 800,
      height: 1200,
      konvaStageJson: null,
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    },
  ];

  const mockPanels: MangaPanel[] = [
    {
      id: 'panel-1',
      projectId: 'test-project-1',
      pageId: 'page-1',
      panelId: 1,
      dialogue: [],
      x: 100,
      y: 100,
      width: 700,
      height: 1000,
      zIndex: 1,
      panelData: {},
      createdAt: '2025-01-29T00:00:00Z',
      updatedAt: '2025-01-29T00:00:00Z',
    },
  ];

  it('should initialize with correct initial state', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('initializing');
    expect(snapshot.context.data.projectId).toBe('test-project-1');
    expect(snapshot.context.data.selectedPageId).toBeUndefined();
    expect(snapshot.context.data.pages).toBeUndefined();
  });

  it('should transition to ready state after loading project, scripts, pages, and panels', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load project
    actor.send({ type: 'PROJECT_LOADED', project: mockProject } as MangaEditorPageEvent);
    
    // Load scripts
    actor.send({ type: 'SCRIPTS_LOADED', scripts: [mockScript] } as MangaEditorPageEvent);
    
    // Load pages
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);
    
    // Load panels (this should transition to ready)
    actor.send({ type: 'PANELS_LOADED', panels: mockPanels } as MangaEditorPageEvent);

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.context.data.selectedPageId).toBe('page-1'); // First page should be auto-selected
    expect(snapshot.context.data.pages).toEqual(mockPages);
    expect(snapshot.context.data.panels).toEqual(mockPanels);
  });

  it('should update selectedPageId when SELECT_PAGE event is sent in ready state', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load all data to reach ready state
    actor.send({ type: 'PROJECT_LOADED', project: mockProject } as MangaEditorPageEvent);
    actor.send({ type: 'SCRIPTS_LOADED', scripts: [mockScript] } as MangaEditorPageEvent);
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);
    actor.send({ type: 'PANELS_LOADED', panels: mockPanels } as MangaEditorPageEvent);

    // Verify initial state
    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.context.data.selectedPageId).toBe('page-1');

    // Select second page
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-2' } as MangaEditorPageEvent);

    snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('ready');
    expect(snapshot.context.data.selectedPageId).toBe('page-2');
    // Panels should be cleared when switching pages
    expect(snapshot.context.data.panels).toBeUndefined();
  });

  it('should clear panels when SELECT_PAGE event is sent', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load all data to reach ready state
    actor.send({ type: 'PROJECT_LOADED', project: mockProject } as MangaEditorPageEvent);
    actor.send({ type: 'SCRIPTS_LOADED', scripts: [mockScript] } as MangaEditorPageEvent);
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);
    actor.send({ type: 'PANELS_LOADED', panels: mockPanels } as MangaEditorPageEvent);

    // Verify panels are loaded
    let snapshot = actor.getSnapshot();
    expect(snapshot.context.data.panels).toEqual(mockPanels);

    // Select different page
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-2' } as MangaEditorPageEvent);

    snapshot = actor.getSnapshot();
    // Panels should be cleared
    expect(snapshot.context.data.panels).toBeUndefined();
  });

  it('should handle multiple page switches correctly', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load all data to reach ready state
    actor.send({ type: 'PROJECT_LOADED', project: mockProject } as MangaEditorPageEvent);
    actor.send({ type: 'SCRIPTS_LOADED', scripts: [mockScript] } as MangaEditorPageEvent);
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);
    actor.send({ type: 'PANELS_LOADED', panels: mockPanels } as MangaEditorPageEvent);

    // Switch to page 2
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-2' } as MangaEditorPageEvent);
    let snapshot = actor.getSnapshot();
    expect(snapshot.context.data.selectedPageId).toBe('page-2');

    // Switch back to page 1
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-1' } as MangaEditorPageEvent);
    snapshot = actor.getSnapshot();
    expect(snapshot.context.data.selectedPageId).toBe('page-1');

    // Switch to page 2 again
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-2' } as MangaEditorPageEvent);
    snapshot = actor.getSnapshot();
    expect(snapshot.context.data.selectedPageId).toBe('page-2');
  });

  it('should auto-select first page when PAGES_LOADED event is sent', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load pages
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.data.selectedPageId).toBe('page-1');
    expect(snapshot.context.data.pages).toEqual(mockPages);
  });

  it('should handle SELECT_PAGE event even when not in ready state (should be ignored or handled gracefully)', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Try to select page before reaching ready state
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-1' } as MangaEditorPageEvent);

    const snapshot = actor.getSnapshot();
    // Should still be in initializing state
    expect(snapshot.value).toBe('initializing');
    // selectedPageId might be updated but we're not in ready state yet
    // This depends on machine design - if SELECT_PAGE is only handled in ready state,
    // it should be ignored here
  });

  it('should maintain selectedPageId when other events are sent', () => {
    const actor = createActor(mangaEditorPageMachine, {
      input: { projectId: 'test-project-1' },
    });
    actor.start();

    // Load all data to reach ready state
    actor.send({ type: 'PROJECT_LOADED', project: mockProject } as MangaEditorPageEvent);
    actor.send({ type: 'SCRIPTS_LOADED', scripts: [mockScript] } as MangaEditorPageEvent);
    actor.send({ type: 'PAGES_LOADED', pages: mockPages } as MangaEditorPageEvent);
    actor.send({ type: 'PANELS_LOADED', panels: mockPanels } as MangaEditorPageEvent);

    // Select page 2
    actor.send({ type: 'SELECT_PAGE', pageId: 'page-2' } as MangaEditorPageEvent);

    // Send other events
    actor.send({ type: 'SELECT_TOOL', tool: 'pen' } as MangaEditorPageEvent);
    actor.send({ type: 'SET_ZOOM', zoom: 1.5 } as MangaEditorPageEvent);

    const snapshot = actor.getSnapshot();
    // selectedPageId should still be page-2
    expect(snapshot.context.data.selectedPageId).toBe('page-2');
    expect(snapshot.context.editor.selectedTool).toBe('pen');
    expect(snapshot.context.editor.zoom).toBe(1.5);
  });
});

