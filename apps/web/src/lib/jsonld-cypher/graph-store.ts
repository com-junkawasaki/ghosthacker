/**
 * In-memory property graph built from JSON-LD.
 *
 * Nodes carry labels (from @type) and properties (all scalar fields).
 * Edges carry a relationship type derived from the JSON-LD key.
 */

export interface GraphNode {
	id: string;
	labels: string[];
	props: Record<string, unknown>;
}

export interface GraphEdge {
	id: string;
	type: string;
	from: string;
	to: string;
	props: Record<string, unknown>;
}

let _nextId = 0;
function autoId(prefix = 'n'): string {
	return `${prefix}:${_nextId++}`;
}

/** Normalize a gh: / dct: / schema: key to a short label. */
function shortKey(key: string): string {
	const prefixes = [
		'https://ghosthacker.gftd.ai/ns/',
		'http://purl.org/dc/terms/',
		'http://schema.org/',
		'gh:',
		'dct:',
		'schema:',
	];
	for (const p of prefixes) {
		if (key.startsWith(p)) return key.slice(p.length);
	}
	return key;
}

function toLabels(raw: unknown): string[] {
	if (!raw) return [];
	if (typeof raw === 'string') return [shortKey(raw)];
	if (Array.isArray(raw)) return raw.map((v) => shortKey(String(v)));
	return [];
}

function isObject(v: unknown): v is Record<string, unknown> {
	return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Resolve bilingual `{en, ja}` objects to a single string (prefer `ja`, fallback `en`). */
function resolveBilingual(v: unknown, lang: 'ja' | 'en' = 'ja'): unknown {
	if (!isObject(v)) return v;
	if ('en' in v || 'ja' in v) {
		return (v[lang] as string) ?? (v[lang === 'ja' ? 'en' : 'ja'] as string) ?? '';
	}
	return v;
}

// ---- Relationship key mapping ----
const CHILD_RELS: Record<string, { label: string; rel: string }> = {
	'gh:pages': { label: 'Page', rel: 'HAS_PAGE' },
	'gh:panels': { label: 'Panel', rel: 'HAS_PANEL' },
	'gh:dialogue': { label: 'Dialogue', rel: 'HAS_DIALOGUE' },
	'gh:caption': { label: 'Caption', rel: 'HAS_CAPTION' },
	'gh:episodes': { label: 'Episode', rel: 'HAS_EPISODE' },
	'gh:arcs': { label: 'Arc', rel: 'HAS_ARC' },
	'gh:characters': { label: 'Character', rel: 'HAS_CHARACTER' },
	'gh:generatedImages': { label: 'GeneratedImage', rel: 'HAS_IMAGE' },
	'gh:marginalia': { label: 'Marginalia', rel: 'HAS_MARGINALIA' },
};

export class GraphStore {
	nodes: Map<string, GraphNode> = new Map();
	edges: GraphEdge[] = [];

	addNode(node: GraphNode): GraphNode {
		this.nodes.set(node.id, node);
		return node;
	}

	addEdge(type: string, from: string, to: string, props: Record<string, unknown> = {}): GraphEdge {
		const edge: GraphEdge = { id: autoId('e'), type, from, to, props };
		this.edges.push(edge);
		return edge;
	}

	getNode(id: string): GraphNode | undefined {
		return this.nodes.get(id);
	}

	/** All nodes matching a label. */
	nodesByLabel(label: string): GraphNode[] {
		return [...this.nodes.values()].filter((n) => n.labels.includes(label));
	}

	/** Outgoing edges from a node, optionally filtered by type. */
	outEdges(nodeId: string, type?: string): GraphEdge[] {
		return this.edges.filter(
			(e) => e.from === nodeId && (type === undefined || e.type === type),
		);
	}

	/** Incoming edges to a node. */
	inEdges(nodeId: string, type?: string): GraphEdge[] {
		return this.edges.filter(
			(e) => e.to === nodeId && (type === undefined || e.type === type),
		);
	}

	/** Follow one relationship hop. */
	traverse(nodeId: string, relType: string): GraphNode[] {
		return this.outEdges(nodeId, relType)
			.map((e) => this.nodes.get(e.to))
			.filter((n): n is GraphNode => n !== undefined);
	}

	// ---- JSON-LD Ingestion ----

	/** Build a graph from a raw JSON-LD object. */
	static fromJsonLd(doc: Record<string, unknown>, lang: 'ja' | 'en' = 'ja'): GraphStore {
		const g = new GraphStore();
		_nextId = 0;
		g.ingestNode(doc, lang);
		return g;
	}

	/** Recursively ingest a JSON-LD node and its children. */
	private ingestNode(
		obj: Record<string, unknown>,
		lang: 'ja' | 'en',
		parentId?: string,
		relType?: string,
		defaultLabel?: string,
	): string {
		const id = (obj['@id'] as string) ??
			(obj['gh:episodeId'] as string) ??
			autoId(defaultLabel?.toLowerCase() ?? 'n');

		const labels = toLabels(obj['@type']);
		if (defaultLabel && !labels.includes(defaultLabel)) labels.push(defaultLabel);

		const props: Record<string, unknown> = {};
		for (const [rawKey, rawVal] of Object.entries(obj)) {
			if (rawKey.startsWith('@')) continue;
			const key = shortKey(rawKey);

			// Known child arrays → create sub-nodes + edges
			if (CHILD_RELS[rawKey]) {
				const arr = Array.isArray(rawVal) ? rawVal : [rawVal];
				const childMeta = CHILD_RELS[rawKey]!;
				for (const item of arr) {
					if (isObject(item)) {
						this.ingestNode(item as Record<string, unknown>, lang, id, childMeta.rel, childMeta.label);
					} else if (typeof item === 'string') {
						// String reference (e.g. character IDs in panels)
						const refId = item;
						this.addEdge(childMeta.rel, id, refId);
					}
				}
				continue;
			}

			// Scalar / bilingual values → props
			const resolved = resolveBilingual(rawVal, lang);
			if (resolved !== undefined && !isObject(resolved)) {
				props[key] = resolved;
			} else if (isObject(resolved)) {
				// Nested object that isn't a known child → flatten
				for (const [sk, sv] of Object.entries(resolved as Record<string, unknown>)) {
					const flatVal = resolveBilingual(sv, lang);
					if (flatVal !== undefined && !isObject(flatVal) && !Array.isArray(flatVal)) {
						props[`${key}.${shortKey(sk)}`] = flatVal;
					}
				}
			}
		}

		this.addNode({ id, labels, props });

		// Link to parent
		if (parentId && relType) {
			this.addEdge(relType, parentId, id);
		}

		return id;
	}

	/** Dump the graph for debugging. */
	dump(): { nodes: GraphNode[]; edges: GraphEdge[] } {
		return {
			nodes: [...this.nodes.values()],
			edges: [...this.edges],
		};
	}
}
