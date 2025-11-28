// Type definitions for the Unified IR Pipeline UI

export interface Entity {
	id: string;
	type: string;
	name?: string;
	llmLabel?: string;
	embedHint?: string;
	imagePrompt?: string;
	videoPrompt?: string;
	embeddingId?: string;
	data: Record<string, unknown>;
}

export interface Relation {
	id: string;
	relationType: string;
	from: string;
	to: string;
	scene?: string;
	strength?: number;
	llmLabel?: string;
	embedHint?: string;
	embeddingId?: string;
}

export interface CreateEntityRequest {
	type: string;
	name?: string;
	llmLabel?: string;
	embedHint?: string;
	imagePrompt?: string;
	videoPrompt?: string;
	data: Record<string, unknown>;
}

export interface CreateRelationRequest {
	relationType: string;
	from: string;
	to: string;
	scene?: string;
	strength?: number;
}

export interface VectorSearchRequest {
	query: string;
	limit?: number;
	threshold?: number;
}

export interface VectorSearchResult {
	entityId: string;
	similarity: number;
	entity: Entity;
}
