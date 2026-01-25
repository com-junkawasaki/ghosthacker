/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/full-test-runner
 * 
 * Full test runner component for XState machine testing
 */
'use client';

import { useState, useCallback } from 'react';
import type { MangaEditorPageEvent } from '@/types/mangaMachine';
import type { SpeechBubble } from '@/types/manga';
import type { ToolType } from '@/lib/konva/tools';

interface TestResult {
  eventName: string;
  success: boolean;
  error?: string;
  duration: number;
  timestamp: number;
}

interface FullTestRunnerProps {
  send: (event: MangaEditorPageEvent) => void;
  currentState: string | Record<string, unknown>;
  projectId: string;
}

export function FullTestRunner({ send, currentState, projectId }: FullTestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testType, setTestType] = useState<'all-events' | 'workflow' | null>(null);

  const runTest = useCallback(async (event: MangaEditorPageEvent, eventName: string): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      send(event);
      const duration = Date.now() - startTime;
      return {
        eventName,
        success: true,
        duration,
        timestamp: Date.now(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        eventName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: Date.now(),
      };
    }
  }, [send]);

  const runAllEventsTest = useCallback(async () => {
    setIsRunning(true);
    setTestType('all-events');
    setTestResults([]);

    const results: TestResult[] = [];

    // Data events
    const dataEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'LOAD_PROJECT', projectId }, name: 'LOAD_PROJECT' },
      { event: { type: 'PROJECT_LOADED', project: { id: 'test-project', title: 'Test Project', description: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, name: 'PROJECT_LOADED' },
      { event: { type: 'SCRIPTS_LOADED', scripts: [] }, name: 'SCRIPTS_LOADED' },
      { event: { type: 'SELECT_SCRIPT', scriptId: 'test-script-id' }, name: 'SELECT_SCRIPT' },
      { event: { type: 'PAGES_LOADED', pages: [] }, name: 'PAGES_LOADED' },
      { event: { type: 'SELECT_PAGE', pageId: 'test-page-id' }, name: 'SELECT_PAGE' },
      { event: { type: 'PANELS_LOADED', panels: [] }, name: 'PANELS_LOADED' },
    ];

    // Editor events
    const editorEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'SELECT_TOOL', tool: 'select' as ToolType }, name: 'SELECT_TOOL (select)' },
      { event: { type: 'SELECT_TOOL', tool: 'draw' as ToolType }, name: 'SELECT_TOOL (draw)' },
      { event: { type: 'SET_ZOOM', zoom: 1.5 }, name: 'SET_ZOOM' },
      { event: { type: 'SELECT_NODE', nodeId: 'test-node-id' }, name: 'SELECT_NODE' },
      { event: { type: 'DESELECT_NODE' }, name: 'DESELECT_NODE' },
      {
        event: {
          type: 'ADD_SPEECH_BUBBLE',
          bubble: {
            id: 'test-bubble-1',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            text: 'Test bubble',
            bubbleType: 'speech',
          } as SpeechBubble,
        },
        name: 'ADD_SPEECH_BUBBLE',
      },
      {
        event: {
          type: 'UPDATE_SPEECH_BUBBLE',
          bubbleId: 'test-bubble-1',
          updates: { text: 'Updated text' },
        },
        name: 'UPDATE_SPEECH_BUBBLE',
      },
      { event: { type: 'DELETE_SPEECH_BUBBLE', bubbleId: 'test-bubble-1' }, name: 'DELETE_SPEECH_BUBBLE' },
      { event: { type: 'EXPORT_START', format: 'png' }, name: 'EXPORT_START (png)' },
      { event: { type: 'EXPORT_COMPLETE' }, name: 'EXPORT_COMPLETE' },
      { event: { type: 'SAVE_START' }, name: 'SAVE_START' },
      { event: { type: 'SAVE_COMPLETE' }, name: 'SAVE_COMPLETE' },
    ];

    // Konva drawing events
    const konvaDrawingEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'KONVA_DRAWING_START', x: 10, y: 10, color: '#000000', strokeWidth: 2 }, name: 'KONVA_DRAWING_START' },
      { event: { type: 'KONVA_DRAWING_MOVE', x: 20, y: 20 }, name: 'KONVA_DRAWING_MOVE' },
      { event: { type: 'KONVA_DRAWING_COMPLETE', lineId: 'test-line-1', points: [10, 10, 20, 20] }, name: 'KONVA_DRAWING_COMPLETE' },
      { event: { type: 'KONVA_DRAWING_CANCEL' }, name: 'KONVA_DRAWING_CANCEL' },
    ];

    // Konva shape events
    const konvaShapeEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'KONVA_SHAPE_START', x: 50, y: 50, shapeType: 'rect', strokeColor: '#000000', fillColor: 'transparent', strokeWidth: 2 }, name: 'KONVA_SHAPE_START (rect)' },
      { event: { type: 'KONVA_SHAPE_MOVE', x: 100, y: 100 }, name: 'KONVA_SHAPE_MOVE' },
      { event: { type: 'KONVA_SHAPE_COMPLETE', shapeId: 'test-shape-1', shape: { type: 'rect', x: 50, y: 50, width: 50, height: 50 } }, name: 'KONVA_SHAPE_COMPLETE' },
      { event: { type: 'KONVA_SHAPE_CANCEL' }, name: 'KONVA_SHAPE_CANCEL' },
    ];

    // Konva text events
    const konvaTextEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'KONVA_TEXT_START', x: 200, y: 200, fontSize: 16, fontFamily: 'sans-serif', fillColor: '#000000' }, name: 'KONVA_TEXT_START' },
      { event: { type: 'KONVA_TEXT_UPDATE', textId: 'test-text-1', text: 'Test text' }, name: 'KONVA_TEXT_UPDATE' },
      { event: { type: 'KONVA_TEXT_COMPLETE', textId: 'test-text-1' }, name: 'KONVA_TEXT_COMPLETE' },
      { event: { type: 'KONVA_TEXT_CANCEL' }, name: 'KONVA_TEXT_CANCEL' },
    ];

    // Konva stage events
    const konvaStageEvents: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'KONVA_STAGE_UPDATE', stageJson: {} }, name: 'KONVA_STAGE_UPDATE' },
      { event: { type: 'KONVA_STAGE_CLICK', x: 100, y: 100, targetId: 'test-target' }, name: 'KONVA_STAGE_CLICK (with target)' },
      { event: { type: 'KONVA_STAGE_CLICK', x: 200, y: 200 }, name: 'KONVA_STAGE_CLICK (empty)' },
    ];

    const allEvents = [
      ...dataEvents,
      ...editorEvents,
      ...konvaDrawingEvents,
      ...konvaShapeEvents,
      ...konvaTextEvents,
      ...konvaStageEvents,
    ];

    // Execute events sequentially with small delay
    for (const { event, name } of allEvents) {
      const result = await runTest(event, name);
      results.push(result);
      setTestResults([...results]);
      await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay between events
    }

    setIsRunning(false);
  }, [runTest, projectId]);

  const runWorkflowTest = useCallback(async () => {
    setIsRunning(true);
    setTestType('workflow');
    setTestResults([]);

    const results: TestResult[] = [];

    // Typical workflow: Project → Scripts → Pages → Panels → Editor operations
    const workflowSteps: Array<{ event: MangaEditorPageEvent; name: string }> = [
      { event: { type: 'LOAD_PROJECT', projectId }, name: '1. Load Project' },
      {
        event: {
          type: 'PROJECT_LOADED',
          project: { id: 'test-project', title: 'Test Project', description: 'Test workflow', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        },
        name: '2. Project Loaded',
      },
      {
        event: {
          type: 'SCRIPTS_LOADED',
          scripts: [{ id: 'script-1', projectId, scriptId: 'script-1', title: 'Test Script', pageCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        },
        name: '3. Scripts Loaded',
      },
      { event: { type: 'SELECT_SCRIPT', scriptId: 'script-1' }, name: '4. Select Script' },
      {
        event: {
          type: 'PAGES_LOADED',
          pages: [{ id: 'page-1', pageId: 'page-1', pageNumber: 1, width: 1200, height: 1800, konvaStageJson: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        },
        name: '5. Pages Loaded',
      },
      { event: { type: 'SELECT_PAGE', pageId: 'page-1' }, name: '6. Select Page' },
      { event: { type: 'PANELS_LOADED', panels: [] }, name: '7. Panels Loaded' },
      { event: { type: 'SELECT_TOOL', tool: 'draw' as ToolType }, name: '8. Select Draw Tool' },
      { event: { type: 'KONVA_DRAWING_START', x: 100, y: 100 }, name: '9. Start Drawing' },
      { event: { type: 'KONVA_DRAWING_MOVE', x: 150, y: 150 }, name: '10. Move Drawing' },
      { event: { type: 'KONVA_DRAWING_COMPLETE', lineId: 'line-1', points: [100, 100, 150, 150] }, name: '11. Complete Drawing' },
      {
        event: {
          type: 'ADD_SPEECH_BUBBLE',
          bubble: {
            id: 'bubble-1',
            x: 200,
            y: 200,
            width: 200,
            height: 100,
            text: 'Hello!',
            bubbleType: 'speech',
          } as SpeechBubble,
        },
        name: '12. Add Speech Bubble',
      },
      { event: { type: 'SELECT_TOOL', tool: 'select' as ToolType }, name: '13. Select Tool' },
      { event: { type: 'SET_ZOOM', zoom: 1.5 }, name: '14. Set Zoom' },
      { event: { type: 'EXPORT_START', format: 'png' }, name: '15. Start Export' },
      { event: { type: 'EXPORT_COMPLETE' }, name: '16. Complete Export' },
    ];

    // Execute workflow steps sequentially
    for (const { event, name } of workflowSteps) {
      const result = await runTest(event, name);
      results.push(result);
      setTestResults([...results]);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Delay between steps
    }

    setIsRunning(false);
  }, [runTest, projectId]);

  const clearResults = useCallback(() => {
    setTestResults([]);
    setTestType(null);
  }, []);

  const successCount = testResults.filter((r) => r.success).length;
  const failureCount = testResults.filter((r) => !r.success).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Full Test Runner</h3>
        {testResults.length > 0 && (
          <button
            type="button"
            onClick={clearResults}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
          >
            クリア
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={runAllEventsTest}
          disabled={isRunning}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning && testType === 'all-events' ? '実行中...' : '全イベントテスト'}
        </button>
        <button
          type="button"
          onClick={runWorkflowTest}
          disabled={isRunning}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isRunning && testType === 'workflow' ? '実行中...' : 'ワークフローテスト'}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-4">
              <span className="text-gray-600">
                成功: <span className="font-semibold text-green-600">{successCount}</span>
              </span>
              <span className="text-gray-600">
                失敗: <span className="font-semibold text-red-600">{failureCount}</span>
              </span>
              <span className="text-gray-600">
                合計: <span className="font-semibold">{testResults.length}</span>
              </span>
              <span className="text-gray-600">
                実行時間: <span className="font-semibold">{totalDuration}ms</span>
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">イベント</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">結果</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">時間</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700">エラー</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className={`border-b border-gray-100 ${result.success ? '' : 'bg-red-50'}`}>
                    <td className="px-2 py-1 font-mono text-gray-700">{result.eventName}</td>
                    <td className="px-2 py-1">
                      {result.success ? (
                        <span className="text-green-600 font-semibold">✓ 成功</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ 失敗</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-gray-600">{result.duration}ms</td>
                    <td className="px-2 py-1 text-red-600 text-xs">{result.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="text-xs text-gray-500 text-center">
          テスト実行中... ({testResults.length} / {testType === 'all-events' ? '~40' : '16'} 完了)
        </div>
      )}
    </div>
  );
}

