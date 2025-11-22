/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/konva-tools
 * 
 * Konva editing tools utilities
 */
import { Stage, Layer, Line, Rect, Circle, Text, Group, Path } from 'konva';

export type ToolType = 'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'text';

export interface DrawingState {
  isDrawing: boolean;
  lastLine?: Line;
  lastShape?: Rect | Circle | Text | Path;
  startPos?: { x: number; y: number };
}

export class ToolManager {
  private stage: Stage | null = null;
  private layer: Layer | null = null;
  private currentTool: ToolType = 'select';
  private drawingState: DrawingState = { isDrawing: false };
  private history: Array<Record<string, unknown>> = [];
  private historyIndex: number = -1;

  setStage(stage: Stage, layer: Layer): void {
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

  handleMouseDown(e: { evt: { preventDefault: () => void }; target: { getStage: () => Stage | null } }): void {
    if (!this.stage || !this.layer) return;

    const stage = this.stage;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    switch (this.currentTool) {
      case 'pen':
        this.startDrawing(pos.x, pos.y);
        break;
      case 'rect':
      case 'circle':
        this.startShape(pos.x, pos.y);
        break;
      case 'text':
        this.createText(pos.x, pos.y);
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

  private startDrawing(x: number, y: number): void {
    if (!this.layer) return;

    const line = new Line({
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

  private startShape(x: number, y: number): void {
    if (!this.layer) return;

    let shape: Rect | Circle;
    if (this.currentTool === 'rect') {
      shape = new Rect({
        x,
        y,
        width: 0,
        height: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      });
    } else {
      shape = new Circle({
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
      const rect = this.drawingState.lastShape as Rect;
      rect.x(Math.min(startX, x));
      rect.y(Math.min(startY, y));
      rect.width(Math.abs(x - startX));
      rect.height(Math.abs(y - startY));
    } else {
      const circle = this.drawingState.lastShape as Circle;
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
      circle.radius(radius);
    }
  }

  private createText(x: number, y: number): void {
    if (!this.layer) return;

    const text = new Text({
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

  undo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.loadState(this.history[this.historyIndex]);
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.loadState(this.history[this.historyIndex]);
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

  private loadState(state: Record<string, unknown>): void {
    if (!this.stage) return;
    this.stage.destroy();
    const newStage = Stage.create(state);
    Object.assign(this.stage, newStage);
  }
}

