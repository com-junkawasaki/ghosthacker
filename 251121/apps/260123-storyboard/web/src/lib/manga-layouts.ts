import { create } from '@bufbuild/protobuf';
import { MangaPanelLayoutSchema } from './gen/proto/storyboard_pb';

export interface LayoutTemplate {
	name: string;
	panels: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
}

export const MANGA_TEMPLATES: Record<number, LayoutTemplate[]> = {
	1: [
		{
			name: 'Full Page',
			panels: [{ x: 0, y: 0, width: 100, height: 100 }]
		}
	],
	2: [
		{
			name: 'Vertical Split',
			panels: [
				{ x: 0, y: 0, width: 100, height: 50 },
				{ x: 0, y: 50, width: 100, height: 50 }
			]
		},
		{
			name: 'Horizontal Split',
			panels: [
				{ x: 0, y: 0, width: 50, height: 100 },
				{ x: 50, y: 0, width: 50, height: 100 }
			]
		}
	],
	3: [
		{
			name: '3 Rows',
			panels: [
				{ x: 0, y: 0, width: 100, height: 33.3 },
				{ x: 0, y: 33.3, width: 100, height: 33.3 },
				{ x: 0, y: 66.6, width: 100, height: 33.4 }
			]
		},
		{
			name: 'Top 1, Bottom 2',
			panels: [
				{ x: 0, y: 0, width: 100, height: 50 },
				{ x: 0, y: 50, width: 50, height: 50 },
				{ x: 50, y: 50, width: 50, height: 50 }
			]
		}
	],
	4: [
		{
			name: '2x2 Grid',
			panels: [
				{ x: 0, y: 0, width: 50, height: 50 },
				{ x: 50, y: 0, width: 50, height: 50 },
				{ x: 0, y: 50, width: 50, height: 50 },
				{ x: 50, y: 50, width: 50, height: 50 }
			]
		},
		{
			name: 'Top 2, Bottom 2',
			panels: [
				{ x: 0, y: 0, width: 50, height: 50 },
				{ x: 50, y: 0, width: 50, height: 50 },
				{ x: 0, y: 50, width: 50, height: 50 },
				{ x: 50, y: 50, width: 50, height: 50 }
			]
		},
		{
			name: 'Vertical 4',
			panels: [
				{ x: 0, y: 0, width: 100, height: 25 },
				{ x: 0, y: 25, width: 100, height: 25 },
				{ x: 0, y: 50, width: 100, height: 25 },
				{ x: 0, y: 75, width: 100, height: 25 }
			]
		}
	],
	5: [
		{
			name: 'Modern 5',
			panels: [
				{ x: 0, y: 0, width: 50, height: 33.3 },
				{ x: 50, y: 0, width: 50, height: 33.3 },
				{ x: 0, y: 33.3, width: 100, height: 33.3 },
				{ x: 0, y: 66.6, width: 50, height: 33.4 },
				{ x: 50, y: 66.6, width: 50, height: 33.4 }
			]
		}
	],
	6: [
		{
			name: '3x2 Grid',
			panels: [
				{ x: 0, y: 0, width: 50, height: 33.3 },
				{ x: 50, y: 0, width: 50, height: 33.3 },
				{ x: 0, y: 33.3, width: 50, height: 33.3 },
				{ x: 50, y: 33.3, width: 50, height: 33.3 },
				{ x: 0, y: 66.6, width: 50, height: 33.4 },
				{ x: 50, y: 66.6, width: 50, height: 33.4 }
			]
		}
	]
};

export function applyTemplate(panels: any[], template: LayoutTemplate) {
	return template.panels.map((p, i) => {
		return create(MangaPanelLayoutSchema, {
			panelIndex: panels[i]?.panel || i + 1,
			x: p.x,
			y: p.y,
			width: p.width,
			height: p.height,
			shape: 'rectangle',
			zIndex: i,
			imageX: 50,
			imageY: 50,
			imageScale: 1.0
		});
	});
}
