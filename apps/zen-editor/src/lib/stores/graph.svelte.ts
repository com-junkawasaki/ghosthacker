import { getClient } from '../api';
import { calculateHierarchicalPositions } from '../tree-utils';

export interface Node {
  id: string;
  label: string;
  type: string;
  group: string;
  content?: string;
  localizedContent?: Record<string, string>;
  viewType?: string; // Add this
  x?: number;
  y?: number;
  children?: string[]; // IDs of children
  
  // 3D properties for Assembler
  position3d: number[];
  rotation3d: number[];
  scale3d: number[];
  gltfPath: string;
}

export interface Edge {
  fromId: string;
  toId: string;
  relation: string;
  group: string;
  color?: string;
  strength?: number;
}

export interface MangaDialogue {
  speaker: string;
  text: string;
  x?: number; // percentage 0-100
  y?: number; // percentage 0-100
  type?: 'normal' | 'thought' | 'shout';
}

export interface MangaPanel {
  id: string;
  panelId: number;
  visual: string;
  dialogue: MangaDialogue[];
  imagePath?: string;
  layout?: string;
}

export interface MangaPage {
  id: string;
  panels: MangaPanel[];
  pageNumber: number;
  type?: string;
  description?: string;
}

class GraphStore {
  nodes = $state<Map<string, Node>>(new Map());
  edges = $state<Edge[]>([]);
  expandedNodes = $state<string[]>([]); // Use array for easier reactivity in Svelte 5
  selectedNodeId = $state<string | null>(null);
  currentViewpointId = $state<string | null>(null);
  isLoading = $state(false);
  projectMetadata = $state<any>(null);
  mangaPages = $state<MangaPage[]>([]);

  viewpoints = $derived([
    { id: 'hub:content', label: 'Timeline', type: 'chronological', description: 'Story progression' },
    { id: 'hub:entity', label: 'Characters', type: 'relationship', description: 'Social graph' },
    { id: 'hub:environment', label: 'World', type: 'atmospheric', description: 'Physical spaces' },
    { id: 'hub:manga', label: 'Manga View', type: 'manga', description: 'Manga layout & lettering' },
    { id: 'hub:assembler', label: '3D Assembler', type: 'assembler', description: 'Scene composition' },
    { id: 'hub:emotion', label: 'Emotions', type: 'heatmap', description: 'Emotional resonance' },
    { id: 'hub:meta', label: 'Meta', type: 'overview', description: 'System architecture' }
  ]);

  constructor() {}

  setViewpoint(id: string | null) {
    this.currentViewpointId = id;
    if (id) {
      this.selectedNodeId = id; // Also select the hub
    }
  }

  async loadMangaScript(projectId: string) {
    console.log(`[Store] Loading manga script for ${projectId}`);
    try {
      const content = await this.openFile(`${projectId}/manga_script.jsonld`);
      if (content) {
        const data = JSON.parse(content);
        this.mangaPages = (data["gh:pages"] || []).map((p: any, idx: number) => ({
          id: p["@id"] || `page:${idx + 1}`,
          pageNumber: idx + 1,
          type: p["gh:type"],
          description: p["gh:description"],
          panels: (p["gh:panels"] || []).map((pan: any) => ({
            id: `${p["@id"] || `page:${idx + 1}`}:panel:${pan["panel:id"]}`,
            panelId: pan["panel:id"],
            visual: pan.visual,
            layout: pan["gh:layout"],
            imagePath: pan["gh:imagePath"], // Load if exists
            dialogue: (pan.dialogue || []).map((d: any) => ({
              speaker: d.speaker,
              text: d.text,
              x: d.x ?? 50,
              y: d.y ?? 50,
              type: d.type ?? 'normal'
            }))
          }))
        }));
        console.log(`[Store] Manga script loaded: ${this.mangaPages.length} pages`);
      }
    } catch (err) {
      console.error("Failed to load manga script:", err);
    }
  }

  async saveMangaScript() {
    if (!this.projectId) return;
    console.log(`[Store] Saving manga script for ${this.projectId}`);
    try {
      const scriptPath = `${this.projectId}/manga_script.jsonld`;
      // We need to preserve the original structure as much as possible
      const originalContent = await this.openFile(scriptPath);
      const data = JSON.parse(originalContent);

      data["gh:pages"] = this.mangaPages.map(p => ({
        "@id": p.id,
        "gh:type": p.type,
        "gh:description": p.description,
        "gh:panels": p.panels.map(pan => ({
          "panel:id": pan.panelId,
          "visual": pan.visual,
          "gh:layout": pan.layout,
          "gh:imagePath": pan.imagePath,
          "dialogue": pan.dialogue.map(d => ({
            speaker: d.speaker,
            text: d.text,
            x: d.x,
            y: d.y,
            type: d.type
          }))
        }))
      }));

      await this.saveFile(scriptPath, JSON.stringify(data, null, 2));
      console.log(`[Store] Manga script saved`);
    } catch (err) {
      console.error("Failed to save manga script:", err);
    }
  }

  updateMangaPanel(pageId: string, panelId: number, updates: Partial<MangaPanel>) {
    const page = this.mangaPages.find(p => p.id === pageId);
    if (page) {
      const panel = page.panels.find(pan => pan.panelId === panelId);
      if (panel) {
        Object.assign(panel, updates);
        this.mangaPages = [...this.mangaPages]; // Trigger reactivity
      }
    }
  }

  async fetchTopology(projectId: string) {
    this.projectId = projectId;
    this.isLoading = true;
    try {
      const client = await getClient();
      if (!client) return;

      const resp = await client.getTopology({ projectId });
      
      const newNodeMap = new Map<string, Node>();
      (resp.nodes || []).forEach((n: any) => {
        newNodeMap.set(n.id, { 
          ...n, 
          children: n.children || [] 
        });
      });

      // Hub containment is already handled by the backend's 'children' and 'memberOf' edges.
      // We keep this for any additional client-side hierarchy if needed.

      // Apply initial hierarchical layout
      const rootCircleIds = [
        'hub:content', 'hub:entity', 'hub:environment', 'hub:item', 'hub:emotion', 
        'hub:asset', 'hub:concept', 'hub:unlinked'
      ];
      const positions = calculateHierarchicalPositions(newNodeMap, resp.edges || [], rootCircleIds);
      
      positions.forEach((pos, id) => {
        const node = newNodeMap.get(id);
        if (node) {
          node.x = pos.x;
          node.y = pos.y;
        }
      });

              this.nodes = newNodeMap;
              this.edges = resp.edges || [];
              console.log("[Store] Nodes updated:", this.nodes.size, "Edges updated:", this.edges.length);
              console.log("[Store] Sample hubs:", Array.from(this.nodes.keys()).filter(id => id.startsWith('hub:')));
      
      // Auto-expand root hubs
      this.expandedNodes = (resp.nodes || [])
        .filter((n: any) => n.id.startsWith('hub:'))
        .map((n: any) => n.id);
        
    } catch (err) {
      console.error("Failed to fetch topology:", err);
    } finally {
      this.isLoading = false;
    }
  }

  async fetchProjectMetadata(projectId: string) {
    console.log(`[Store] Fetching project metadata for ${projectId}`);
    try {
      const client = await getClient();
      if (!client) return;
      const resp = await client.getProjectMetadata({ projectId });
      this.projectMetadata = resp;
      console.log(`[Store] Project metadata updated: ${resp.episodes?.length} episodes found`);
    } catch (err) {
      console.error("Failed to fetch project metadata:", err);
    }
  }

  async openFile(path: string): Promise<string> {
    console.log(`[Store] Opening file: ${path}`);
    try {
      const client = await getClient();
      if (!client) throw new Error("Client not initialized");
      const resp = await client.openFile({ path });
      console.log(`[Store] File opened, content length: ${resp.content?.length}`);
      return resp.content || "";
    } catch (err) {
      console.error(`[Store] Failed to open file ${path}:`, err);
      throw err;
    }
  }

  async saveFile(path: string, content: string): Promise<boolean> {
    const client = await getClient();
    if (!client) return false;
    const resp = await client.saveFile({ path, content });
    return resp.success;
  }

  async fetchBlocks(manuscriptId: string) {
    if (!this.projectId) return;
    try {
      const client = await getClient();
      if (!client) return;

      const resp = await client.getBlocks({ 
        projectId: this.projectId,
        manuscriptId 
      });

      // Update nodes map
      (resp.nodes || []).forEach((n: any) => {
        if (!this.nodes.has(n.id)) {
          this.nodes.set(n.id, { 
            ...n, 
            children: n.children || [] 
          });
        }
      });

      // Update parent children list from response
      const parent = this.nodes.get(manuscriptId);
      if (parent) {
        const childIds = (resp.nodes || []).map((n: any) => n.id);
        parent.children = Array.from(new Set([...(parent.children || []), ...childIds]));
      }

      // Merge edges
      const newEdges = [...this.edges];
      (resp.edges || []).forEach((e: any) => {
        const exists = newEdges.some(ex => ex.fromId === e.fromId && ex.toId === e.toId);
        if (!exists) {
          newEdges.push(e);
        }
      });
      this.edges = newEdges;

      // Recalculate positions for new nodes
      const rootCircleIds = [
        'hub:content', 'hub:entity', 'hub:environment', 'hub:item', 'hub:emotion', 
        'hub:asset', 'hub:concept', 'hub:unlinked'
      ];
      const positions = calculateHierarchicalPositions(this.nodes, this.edges, rootCircleIds);
      positions.forEach((pos, id) => {
        const node = this.nodes.get(id);
        if (node) {
          node.x = pos.x;
          node.y = pos.y;
        }
      });

    } catch (err) {
      console.error("Failed to fetch blocks:", err);
    }
  }

  async saveManuscript(manuscriptId: string, contentOrBlocks: string | any[]) {
    if (!this.projectId) return;
    try {
      const client = await getClient();
      if (!client) return;

      let blocks = [];
      if (typeof contentOrBlocks === 'string') {
        const rawBlocks = contentOrBlocks.split('\n\n');
        blocks = rawBlocks.map((text, i) => ({
          id: `${manuscriptId}:block:${i}`,
          content: text.trim(),
          type: 'gh:Block',
          localizedContent: { ja: text.trim() } // assume ja for raw edit
        })).filter(b => b.content !== "");
      } else {
        blocks = contentOrBlocks;
      }

      await client.saveManuscript({
        projectId: this.projectId,
        manuscriptId,
        blocks
      });

      // Refresh blocks in store
      await this.fetchBlocks(manuscriptId);
      // alert("Manuscript saved successfully");
    } catch (err) {
      console.error("Failed to save manuscript:", err);
      alert("Failed to save manuscript");
    }
  }

  toggleExpand(nodeId: string) {
    const index = this.expandedNodes.indexOf(nodeId);
    if (index !== -1) {
      this.expandedNodes = this.expandedNodes.filter(id => id !== nodeId);
    } else {
      const node = this.nodes.get(nodeId);
      if (node && node.type === 'gh:Manuscript' && (!node.children || node.children.length === 0)) {
        this.fetchBlocks(nodeId);
      }
      this.expandedNodes = [...this.expandedNodes, nodeId];
    }
  }

  selectNode(nodeId: string | null) {
    this.selectedNodeId = nodeId;
    if (nodeId) {
      const node = this.nodes.get(nodeId);
      if (node && node.type === 'gh:Manuscript' && (!node.children || node.children.length === 0)) {
        this.fetchBlocks(nodeId);
      }
    }
  }

  async updateNode3d(id: string, updates: Partial<{
    position3d: number[];
    rotation3d: number[];
    scale3d: number[];
    gltfPath: string;
  }>) {
    const node = this.nodes.get(id);
    if (node) {
      Object.assign(node, updates);
      this.nodes = new Map(this.nodes); // Trigger reactivity

      // Persist to backend
      if (this.projectId) {
        try {
          const client = await getClient();
          if (!client) return;

          await client.saveNode({
            projectId: this.projectId,
            node: {
              ...node,
              position3d: node.position3d && node.position3d.length === 3 ? node.position3d : [0, 0, 0],
              rotation3d: node.rotation3d && node.rotation3d.length === 3 ? node.rotation3d : [0, 0, 0],
              scale3d: node.scale3d && node.scale3d.length === 3 ? node.scale3d : [1, 1, 1],
              gltfPath: node.gltfPath || ""
            } as any
          });
        } catch (err) {
          console.error("Failed to persist node 3d update:", err);
        }
      }
    }
  }

  private projectId = "";

  updateNodePositions(positions: Float32Array | number[]) {
    let changed = false;
    const nodeList = Array.from(this.nodes.values());
    if (positions.length < nodeList.length * 2) return;

    nodeList.forEach((node, i) => {
      const nx = positions[i * 2];
      const ny = positions[i * 2 + 1];
      if (nx !== undefined && ny !== undefined && (node.x !== nx || node.y !== ny)) {
        node.x = nx;
        node.y = ny;
        changed = true;
      }
    });

    if (changed) {
      // Trigger map update to notify observers of derived state
      this.nodes = new Map(this.nodes);
    }
  }
}

export const graphStore = new GraphStore();

