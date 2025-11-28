'use client';

import { useEffect, useState } from 'react';
import { loadProject, loadNarrative, loadStyles, loadPlatforms } from './actions';
import { graphqlClient, mutations } from '@/lib/graphql-client';
import { deriveCanvasConfig } from '@/lib/mapping';

type Project = { title: string; logline: string; genres: string[]; tone: string; keywords?: string[] } | null;
type Beat = { id: string; label: string; purpose: 'setup'|'conflict'|'climax'; targetLength: number };
type Narrative = { synopsis: string; structure: string; beats?: Beat[] } | null;

const PROJECT_ID = 'ghost-hacker-project';

export default function PreviewPanel() {
  // Local cache if Neided later; currently used only for estimates and mapping
  const [, setProject] = useState<Project>(null);
  const [, setNarrative] = useState<Narrative>(null);
  const [estimates, setEstimates] = useState<{ words: number; durationSec: number; panels: number }>({ words: 0, durationSec: 0, panels: 0 });

  useEffect(() => {
    (async () => {
      const [p, n, s, pl] = await Promise.all([
        loadProject(),
        loadNarrative(),
        loadStyles(),
        loadPlatforms(),
      ]);
      setProject(p); setNarrative(n);
      const words = (n?.beats ?? []).reduce((s: number, b: Beat) => s + (b.targetLength ?? 0), 0);
      const durationSec = Math.round((words / 150) * 60);
      const panels = n?.beats ? n.beats.length * 4 : 40;
      setEstimates({ words, durationSec, panels });
      setCanvas(deriveCanvasConfig({ project: p ?? undefined, narrative: n ?? undefined, styles: s ?? undefined, platforms: pl ?? undefined }));
    })();
  }, []);

  const [canvas, setCanvas] = useState(deriveCanvasConfig({ project: null, narrative: null, styles: null, platforms: null }));

  const handleSeedCanvas = async () => {
    try {
      // Get all data
      const [p, n, s, pl, eps] = await Promise.all([
        loadProject(),
        loadNarrative(),
        loadStyles(),
        loadPlatforms(),
        // TODO: Load episodes
        Promise.resolve([]),
      ]);
      
      const config = deriveCanvasConfig({
        project: p ?? undefined,
        narrative: n ?? undefined,
        styles: s ?? undefined,
        platforms: pl ?? undefined,
        episodes: eps.map((e: any) => ({ episodeId: e.id, sourcePath: e.sourcePath })),
      });
      
      await graphqlClient.request(mutations.saveCanvas, {
        projectId: PROJECT_ID,
        input: {
          nodes: config.nodes,
          edges: config.edges,
        },
      });
    } catch (error) {
      console.error('Failed to seed canvas', error);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-gray-200 p-3 bg-white">
          <div className="text-xs text-gray-500">Est. words</div>
          <div className="text-lg font-semibold">{estimates.words}</div>
        </div>
        <div className="rounded border border-gray-200 p-3 bg-white">
          <div className="text-xs text-gray-500">Est. duration</div>
          <div className="text-lg font-semibold">{estimates.durationSec}s</div>
        </div>
        <div className="rounded border border-gray-200 p-3 bg-white">
          <div className="text-xs text-gray-500">Est. panels</div>
          <div className="text-lg font-semibold">{estimates.panels}</div>
        </div>
      </div>

      <div className="rounded border border-gray-200 p-3 bg-white">
        <div className="text-xs text-gray-500 mb-2">Canvas preview (nodes/edges)</div>
        <div className="flex items-center justify-between">
          <div>Nodes: {canvas.nodes.length} / Edges: {canvas.edges.length}</div>
          <button
            onClick={handleSeedCanvas}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-black"
          >
            Seed Canvas
          </button>
        </div>
      </div>
    </div>
  );
}
