/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/konva-layer-manager
 * 
 * Konva layer management utilities
 */

export interface KonvaLayer {
  id: string;
  name: string;
  type: 'image' | 'drawing' | 'text' | 'speech_bubble';
  zIndex: number;
  visible: boolean;
  opacity: number;
  data: Record<string, unknown>;
}

export class LayerManager {
  private layers: KonvaLayer[] = [];

  addLayer(layer: KonvaLayer): void {
    this.layers.push(layer);
    this.sortLayers();
  }

  removeLayer(layerId: string): void {
    this.layers = this.layers.filter((layer) => layer.id !== layerId);
  }

  updateLayer(layerId: string, updates: Partial<KonvaLayer>): void {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) {
      Object.assign(layer, updates);
      this.sortLayers();
    }
  }

  toggleVisibility(layerId: string): void {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  setZIndex(layerId: string, zIndex: number): void {
    const layer = this.layers.find((l) => l.id === layerId);
    if (layer) {
      layer.zIndex = zIndex;
      this.sortLayers();
    }
  }

  getLayers(): KonvaLayer[] {
    return [...this.layers];
  }

  getVisibleLayers(): KonvaLayer[] {
    return this.layers.filter((layer) => layer.visible);
  }

  private sortLayers(): void {
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }
}

