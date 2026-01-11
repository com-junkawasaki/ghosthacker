declare module 'cosmos-lib' {
    export interface GraphConfig {
        backgroundColor?: string;
        nodeSize?: number;
        linkWidth?: number;
        linkColor?: string;
        nodeColor?: string;
        simulation?: {
            repulsion?: number;
            gravity?: number;
            friction?: number;
        };
    }

    export class Graph {
        constructor(canvas: HTMLCanvasElement, config?: GraphConfig);
        setData(nodes: any[], links: any[]): void;
        zoomToFit(duration?: number): void;
        destroy(): void;
        onClick?: (nodeIndex: number | undefined) => void;
    }
}

