// IR management API functions

import { apiClient } from './client';
import type { Entity, Relation, CreateEntityRequest, CreateRelationRequest } from '../types';

export const irApi = {
	// Entities
	async listEntities(): Promise<Entity[]> {
		return apiClient.get<Entity[]>('/api/ir/entities');
	},

	async getEntity(id: string): Promise<Entity> {
		return apiClient.get<Entity>(`/api/ir/entities/${id}`);
	},

	async createEntity(entity: CreateEntityRequest): Promise<Entity> {
		return apiClient.post<Entity>('/api/ir/entities', entity);
	},

	async updateEntity(id: string, entity: Partial<Entity>): Promise<Entity> {
		return apiClient.put<Entity>(`/api/ir/entities/${id}`, entity);
	},

	async deleteEntity(id: string): Promise<void> {
		return apiClient.delete(`/api/ir/entities/${id}`);
	},

	// Relations
	async listRelations(): Promise<Relation[]> {
		return apiClient.get<Relation[]>('/api/ir/relations');
	},

	async createRelation(relation: CreateRelationRequest): Promise<Relation> {
		return apiClient.post<Relation>('/api/ir/relations', relation);
	},
};
