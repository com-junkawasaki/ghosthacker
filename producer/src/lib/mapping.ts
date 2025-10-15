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

  const add = (id: string, type: string, label: string, extra?: Record<string, unknown>) => {
    nodes.push({ id, type, label, data: { id, type, label, ...(extra ?? {}) } });
  };

  add('source-1', 'sourceDoc', opts.project?.title ?? 'Project');
  add('prompt-1', 'prompt', 'Story Prompt');
  add('writer-1', 'writer', 'AI Writer');
  add('image-gen-1', 'imageGen', 'Image Generation', { palette: opts.styles?.visual?.palette });
  add('webtoon-panel-gen-1', 'webtoonPanelGen', 'Panel Generator', { panelCount: opts.platforms?.webtoon?.episodePanels ?? 40 });
  add('webtoon-layout-1', 'webtoonLayout', 'Layout Designer');
  add('webtoon-export-1', 'webtoonExport', 'Webtoon Export');
  add('video-gen-1', 'videoGen', 'Video Generation', { duration: opts.platforms?.youtube?.targetDurationSec ?? 300, aspect: opts.platforms?.youtube?.aspectRatio ?? '9:16', voice: opts.styles?.audio?.voice });
  add('tts-1', 'tts', 'Text-to-Speech', { voice: opts.styles?.audio?.voice });
  add('render-1', 'render', 'Video Render');
  add('wattpad-1', 'exportWattpad', 'Wattpad Export', { chapters: opts.platforms?.wattpad?.chapterCount ?? 10 });
  add('youtube-1', 'publishYouTube', 'YouTube Upload');

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


