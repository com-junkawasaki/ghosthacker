// Export all node types
export { SourceDocNode } from './SourceDocNode';
export { PromptNode } from './PromptNode';
export { WriterNode } from './WriterNode';
export { ImageGenNode } from './ImageGenNode';
export { VideoGenNode } from './VideoGenNode';
export { TTSNode } from './TTSNode';
export { RenderNode } from './RenderNode';
export { WebtoonPanelGen } from './WebtoonPanelGen';
export { WebtoonLayout } from './WebtoonLayout';
export { WebtoonExport } from './WebtoonExport';
export { ExportWattpadNode } from './ExportWattpadNode';
export { PublishYouTubeNode } from './PublishYouTubeNode';
export { ProtagonistNode } from './ProtagonistNode';
export { BackstoryNode } from './BackstoryNode';
export { WorldNode } from './WorldNode';
export { CharacterNode } from './CharacterNode';
export { EpisodeNode } from './EpisodeNode';

// Node data types
export type NodeData = {
  id: string;
  type: string;
  label: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: Record<string, string | number | boolean | null>;
  outputs?: Record<string, string | number | boolean | null>;
};

// Base node component props
export interface NodeProps {
  data: NodeData;
  selected?: boolean;
}
