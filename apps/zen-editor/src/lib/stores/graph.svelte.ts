import { getClient } from '../api';

export interface Node {
  id: string;
  label: string;
  type: string;
  group: string;
  content?: string;
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
  expandedNodes = $state<Set<string>>(new Set());
  selectedNodeId = $state<string | null>(null);
  isLoading = $state(false);

  constructor() {}

  async fetchTopology(projectId: string) {
    this.projectId = projectId;
    this.isLoading = true;
    try {
      const client = await getClient();
      if (!client) return;

      const resp = await client.getTopology({ projectId });
      
      const newNodeMap = new Map<string, Node>();
      (resp.nodes || []).forEach((n: any) => {
        newNodeMap.set(n.id, { ...n, children: [] });
      });

      // Build containment relations for tree
      (resp.edges || []).forEach((e: any) => {
        if (e.relation === 'gh:memberOf' || e.relation === 'gh:contains' || e.relation === 'gh:partOf') {
          const parent = newNodeMap.get(e.fromId);
          if (parent) {
            if (!parent.children) parent.children = [];
            if (!parent.children.includes(e.toId)) {
              parent.children.push(e.toId);
            }
          }
        }
      });

      this.nodes = newNodeMap;
      this.edges = resp.edges || [];
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
        this.nodes.set(n.id, { ...n, children: [] });
      });

      // Update parent children list
      const parent = this.nodes.get(manuscriptId);
      if (parent) {
        if (!parent.children) parent.children = [];
        (resp.nodes || []).forEach((n: any) => {
          if (!parent.children!.includes(n.id)) {
            parent.children!.push(n.id);
          }
        });
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

    } catch (err) {
      console.error("Failed to fetch blocks:", err);
    }
  }

  async saveManuscript(manuscriptId: string, content: string) {
    if (!this.projectId) return;
    try {
      const client = await getClient();
      if (!client) return;

      // Split content into blocks
      const rawBlocks = content.split('\n\n');
      const blocks = rawBlocks.map((text, i) => ({
        id: `${manuscriptId}:block:${i}`,
        content: text.trim(),
        type: 'gh:Block'
      })).filter(b => b.content !== "");

      await client.saveManuscript({
        projectId: this.projectId,
        manuscriptId,
        blocks
      });

      // Refresh blocks in store
      await this.fetchBlocks(manuscriptId);
      alert("Manuscript saved successfully as JSON-LD");
    } catch (err) {
      console.error("Failed to save manuscript:", err);
      alert("Failed to save manuscript");
    }
  }

  toggleExpand(nodeId: string) {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      const node = this.nodes.get(nodeId);
      if (node && node.type === 'gh:Manuscript' && (!node.children || node.children.length === 0)) {
        this.fetchBlocks(nodeId);
      }
      this.expandedNodes.add(nodeId);
    }
  }

  private projectId = "";

  selectNode(nodeId: string | null) {
    this.selectedNodeId = nodeId;
  }
}

export const graphStore = new GraphStore();

