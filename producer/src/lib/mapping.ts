// Map StoryBrief data to Canvas node configuration
export type CanvasNodeConfig = {
  id: string;
  type: string;
  label: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
};

export type CanvasConfig = {
  nodes: CanvasNodeConfig[];
  edges: { id: string; source: string; target: string }[];
};

export function deriveCanvasConfig(opts: {
  project?: { title: string } | null;
  narrative?: { beats?: { id: string }[] } | null;
  styles?: { visual?: { palette?: string }; audio?: { voice?: string } } | null;
  platforms?: {
    wattpad?: { chapterCount?: number };
    webtoon?: { episodePanels?: number };
    youtube?: { targetDurationSec?: number; aspectRatio?: string };
  } | null;
}): CanvasConfig {
  const nodes: CanvasNodeConfig[] = [];

  nodes.push({ id: 'source-1', type: 'sourceDoc', label: opts.project?.title ?? 'Project' });
  nodes.push({ id: 'prompt-1', type: 'prompt', label: 'Story Prompt' });
  nodes.push({ id: 'writer-1', type: 'writer', label: 'AI Writer' });
  nodes.push({ id: 'image-gen-1', type: 'imageGen', label: 'Image Generation', data: { palette: opts.styles?.visual?.palette } });
  nodes.push({ id: 'webtoon-panel-gen-1', type: 'webtoonPanelGen', label: 'Panel Generator', data: { panels: opts.platforms?.webtoon?.episodePanels ?? 40 } });
  nodes.push({ id: 'webtoon-layout-1', type: 'webtoonLayout', label: 'Layout Designer' });
  nodes.push({ id: 'webtoon-export-1', type: 'webtoonExport', label: 'Webtoon Export' });
  nodes.push({ id: 'video-gen-1', type: 'videoGen', label: 'Video Generation', data: { duration: opts.platforms?.youtube?.targetDurationSec ?? 300, aspect: opts.platforms?.youtube?.aspectRatio ?? '9:16', voice: opts.styles?.audio?.voice } });
  nodes.push({ id: 'tts-1', type: 'tts', label: 'Text-to-Speech', data: { voice: opts.styles?.audio?.voice } });
  nodes.push({ id: 'render-1', type: 'render', label: 'Video Render' });
  nodes.push({ id: 'wattpad-1', type: 'exportWattpad', label: 'Wattpad Export', data: { chapters: opts.platforms?.wattpad?.chapterCount ?? 10 } });
  nodes.push({ id: 'youtube-1', type: 'publishYouTube', label: 'YouTube Upload' });

  const edges = [
    { id: 'e1', source: 'source-1', target: 'prompt-1' },
    { id: 'e2', source: 'prompt-1', target: 'writer-1' },
    { id: 'e3', source: 'writer-1', target: 'image-gen-1' },
    { id: 'e4', source: 'writer-1', target: 'tts-1' },
    { id: 'e5', source: 'image-gen-1', target: 'webtoon-panel-gen-1' },
    { id: 'e6', source: 'webtoon-panel-gen-1', target: 'webtoon-layout-1' },
    { id: 'e7', source: 'webtoon-layout-1', target: 'webtoon-export-1' },
    { id: 'e8', source: 'image-gen-1', target: 'video-gen-1' },
    { id: 'e9', source: 'tts-1', target: 'video-gen-1' },
    { id: 'e10', source: 'video-gen-1', target: 'render-1' },
    { id: 'e11', source: 'render-1', target: 'wattpad-1' },
    { id: 'e12', source: 'render-1', target: 'youtube-1' },
  ];

  return { nodes, edges };
}


