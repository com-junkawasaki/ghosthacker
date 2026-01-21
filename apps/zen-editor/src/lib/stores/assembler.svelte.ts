import { getClient } from '../api';

export interface SceneObject {
  id: string;
  type: string; // e.g., 'gh:prop/okamura-cruise-atlas', 'gh:character/ren'
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  gltfPath?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

class AssemblerStore {
  objects = $state<SceneObject[]>([]);
  selectedObjectId = $state<string | null>(null);
  camera = $state<CameraState>({
    position: [5, 2, 5],
    target: [0, 0, 0],
    fov: 50
  });

  // Derived state
  selectedObject = $derived(
    this.objects.find(obj => obj.id === this.selectedObjectId) || null
  );

  constructor() {}

  addObject(type: string, name: string, gltfPath?: string) {
    const id = crypto.randomUUID();
    const newObj: SceneObject = {
      id,
      type,
      name,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      gltfPath
    };
    this.objects = [...this.objects, newObj];
    this.selectedObjectId = id;
  }

  removeObject(id: string) {
    this.objects = this.objects.filter(obj => obj.id !== id);
    if (this.selectedObjectId === id) {
      this.selectedObjectId = null;
    }
  }

  updateObject(id: string, updates: Partial<Omit<SceneObject, 'id'>>) {
    this.objects = this.objects.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    );
  }

  selectObject(id: string | null) {
    this.selectedObjectId = id;
  }

  updateCamera(updates: Partial<CameraState>) {
    this.camera = { ...this.camera, ...updates };
  }

  clearScene() {
    this.objects = [];
    this.selectedObjectId = null;
  }
}

export const assemblerStore = new AssemblerStore();
