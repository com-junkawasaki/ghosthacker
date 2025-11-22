/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/konva-tools
 * 
 * Konva editing tools utilities
 */
import type { Stage as KonvaStageType, Layer as KonvaLayerType, Line as KonvaLineType, Rect as KonvaRectType, Circle as KonvaCircleType, Text as KonvaTextType, Group as KonvaGroupType, Path as KonvaPathType } from 'konva';

export type ToolType = 'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'text';

export interface DrawingState {
  isDrawing: boolean;
  lastLine?: KonvaLineType;
  lastShape?: KonvaRectType | KonvaCircleType | KonvaTextType | KonvaPathType;
  startPos?: { x: number; y: number };
}

export class ToolManager {
  private stage: KonvaStageType | null = null;
  private layer: KonvaLayerType | null = null;
  private currentTool: ToolType = 'select';
  private drawingState: DrawingState = { isDrawing: false };
  private history: Array<Record<string, unknown>> = [];
  private historyIndex: number = -1;

  setStage(stage: KonvaStageType, layer: KonvaLayerType): void {
    this.stage = stage;
    this.layer = layer;
    this.saveState();
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.drawingState = { isDrawing: false };
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  async handleMouseDown(e: { evt: { preventDefault: () => void }; target: { getStage: () => KonvaStageType | null } }): Promise<void> {
    if (!this.stage || !this.layer || typeof window === 'undefined') return;

    const stage = this.stage;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    switch (this.currentTool) {
      case 'pen':
        await this.startDrawing(pos.x, pos.y);
        break;
      case 'rect':
      case 'circle':
        await this.startShape(pos.x, pos.y);
        break;
      case 'text':
        await this.createText(pos.x, pos.y);
        break;
    }
  }

  handleMouseMove(e: { evt: { preventDefault: () => void } }): void {
    if (!this.stage || !this.layer || !this.drawingState.isDrawing) return;

    const stage = this.stage;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    switch (this.currentTool) {
      case 'pen':
        this.continueDrawing(pos.x, pos.y);
        break;
      case 'rect':
      case 'circle':
        this.updateShape(pos.x, pos.y);
        break;
    }
  }

  handleMouseUp(): void {
    if (this.drawingState.isDrawing) {
      this.finishDrawing();
      this.saveState();
    }
  }

  private async startDrawing(x: number, y: number): Promise<void> {
    if (!this.layer || typeof window === 'undefined') return;
    const KonvaModule = await import('konva');
    const Konva = KonvaModule.default;

    const line = new Konva.Line({
      points: [x, y],
      stroke: '#000000',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
    });

    this.layer.add(line);
    this.drawingState = {
      isDrawing: true,
      lastLine: line,
      startPos: { x, y },
    };
  }

  private continueDrawing(x: number, y: number): void {
    if (!this.drawingState.lastLine) return;

    const oldPoints = this.drawingState.lastLine.points();
    const newPoints = [...oldPoints, x, y];
    this.drawingState.lastLine.points(newPoints);
  }

  private async startShape(x: number, y: number): Promise<void> {
    if (!this.layer || typeof window === 'undefined') return;
    const KonvaModule = await import('konva');
    const Konva = KonvaModule.default;

    let shape: KonvaRectType | KonvaCircleType;
    if (this.currentTool === 'rect') {
      shape = new Konva.Rect({
        x,
        y,
        width: 0,
        height: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      });
    } else {
      shape = new Konva.Circle({
        x,
        y,
        radius: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      });
    }

    this.layer.add(shape);
    this.drawingState = {
      isDrawing: true,
      lastShape: shape,
      startPos: { x, y },
    };
  }

  private updateShape(x: number, y: number): void {
    if (!this.drawingState.lastShape || !this.drawingState.startPos) return;

    const startX = this.drawingState.startPos.x;
    const startY = this.drawingState.startPos.y;

    if (this.currentTool === 'rect') {
      const rect = this.drawingState.lastShape as KonvaRectType;
      rect.x(Math.min(startX, x));
      rect.y(Math.min(startY, y));
      rect.width(Math.abs(x - startX));
      rect.height(Math.abs(y - startY));
    } else {
      const circle = this.drawingState.lastShape as KonvaCircleType;
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
      circle.radius(radius);
    }
  }

  private async createText(x: number, y: number): Promise<void> {
    if (!this.layer || typeof window === 'undefined') return;
    const KonvaModule = await import('konva');
    const Konva = KonvaModule.default;

    const text = new Konva.Text({
      x,
      y,
      text: 'テキストを入力',
      fontSize: 16,
      fontFamily: 'sans-serif',
      fill: '#000000',
      draggable: true,
    });

    this.layer.add(text);
    this.saveState();
  }

  private finishDrawing(): void {
    this.drawingState = { isDrawing: false };
  }

  async undo(): Promise<void> {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    await this.loadState(this.history[this.historyIndex]);
  }

  async redo(): Promise<void> {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    await this.loadState(this.history[this.historyIndex]);
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  private saveState(): void {
    if (!this.stage) return;
    const state = this.stage.toJSON();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  private async loadState(state: Record<string, unknown>): Promise<void> {
    if (!this.stage || typeof window === 'undefined') return;
    this.stage.destroy();
    const KonvaModule = await import('konva');
    const Konva = KonvaModule.default;
    const newStage = Konva.Stage.create(state);
    Object.assign(this.stage, newStage);
  }
}

