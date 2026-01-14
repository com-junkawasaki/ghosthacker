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
}

export interface Edge {
  fromId: string;
  toId: string;
  relation: string;
  group: string;
  color?: string;
  strength?: number;
}

class GraphStore {
  nodes = $state<Map<string, Node>>(new Map());
  edges = $state<Edge[]>([]);
  expandedNodes = $state<string[]>([]); // Use array for easier reactivity in Svelte 5
  selectedNodeId = $state<string | null>(null);
  currentViewpointId = $state<string | null>(null);
  isLoading = $state(false);

  viewpoints = $derived([
    { id: 'hub:content', label: 'Timeline', type: 'chronological', description: 'Story progression' },
    { id: 'hub:entity', label: 'Characters', type: 'relationship', description: 'Social graph' },
    { id: 'hub:environment', label: 'World', type: 'atmospheric', description: 'Physical spaces' },
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

  private projectId = "";

  updateNodePositions(positions: Float32Array) {
    let changed = false;
    const nodeList = Array.from(this.nodes.values());
    if (positions.length < nodeList.length * 2) return;

    nodeList.forEach((node, i) => {
      const nx = positions[i * 2];
      const ny = positions[i * 2 + 1];
      if (node.x !== nx || node.y !== ny) {
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

