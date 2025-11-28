/**
 * @context https://schema.org/DatabaseSchema
 * @type {gh:DrizzleSchema}
 * Merkle DAG: drizzle-schema -> drizzle-orm -> postgres
 * Database schema definitions using Drizzle ORM for Supabase PostgreSQL
 */
import { pgTable, text, jsonb, timestamp, uuid, varchar, integer, boolean } from 'drizzle-orm/pg-core';

// Project table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  logline: text('logline').notNull(),
  genres: jsonb('genres').$type<string[]>().notNull(),
  tone: varchar('tone', { length: 50 }).notNull(),
  audienceRating: varchar('audience_rating', { length: 20 }).notNull(),
  language: varchar('language', { length: 10 }).notNull(),
  keywords: jsonb('keywords').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Narrative table
export const narratives = pgTable('narratives', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  synopsis: text('synopsis').notNull(),
  structure: varchar('structure', { length: 50 }).notNull(),
  beats: jsonb('beats').$type<Array<{
    id: string;
    label: string;
    purpose: 'setup' | 'conflict' | 'climax';
    targetLength: number;
  }>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Characters table
export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'protagonist' | 'antagonist' | 'support'
  motivation: text('motivation'),
  conflict: text('conflict'),
  voice: varchar('voice', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Backstories table
export const backstories = pgTable('backstories', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  origin: text('origin').notNull(),
  motivation: text('motivation'),
  conflict: text('conflict'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Episodes table
export const episodes = pgTable('episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  episodeId: text('episode_id').notNull(), // for compatibility with SourceDoc schema
  name: text('name').notNull(),
  episodeNumber: varchar('episode_number', { length: 20 }).notNull(),
  sourcePath: text('source_path'),
  hasPart: jsonb('has_part').$type<Array<{
    '@type': 'schema:TextDigitalDocument' | 'schema:ImageObject' | 'schema:VideoObject' | 'schema:AudioObject';
    'schema:contentUrl': string;
    'schema:name'?: string;
    'schema:description'?: string;
  }>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Styles table
export const styles = pgTable('styles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull().unique(),
  visual: jsonb('visual').$type<{
    artStyle: string;
    palette: string;
    nsfwAllowed: boolean;
  }>().notNull(),
  audio: jsonb('audio').$type<{
    voice: string;
    tempo: string;
    musicMood: string;
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Platforms table
export const platforms = pgTable('platforms', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull().unique(),
  wattpad: jsonb('wattpad').$type<{
    chapterCount: number;
    includeImages: boolean;
    chapterLengthWords?: [number, number];
    imageFrequency: string;
  }>().notNull(),
  webtoon: jsonb('webtoon').$type<{
    episodePanels: number;
    bubbleDensity: string;
    readingPace: string;
    soundEffects: boolean;
  }>().notNull(),
  youtube: jsonb('youtube').$type<{
    targetDurationSec: number;
    aspectRatio: string;
    captions: boolean;
    brollRatio: number;
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Canvas table
export const canvas = pgTable('canvas', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull().unique(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// PipelineNode table (for node configs)
export const pipelineNodes = pgTable('pipeline_nodes', {
  id: text('id').primaryKey(), // nodeId from pipeline
  nodeType: varchar('node_type', { length: 50 }).notNull(),
  label: text('label').notNull(),
  configJson: jsonb('config_json').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Artifacts table
export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: text('node_id').references(() => pipelineNodes.id, { onDelete: 'cascade' }).notNull(),
  nodeType: varchar('node_type', { length: 50 }).notNull(),
  label: text('label'),
  payloadJson: jsonb('payload_json').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports for Zod inference
export type Project = typeof projects.$inferSelect;
export type Narrative = typeof narratives.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Backstory = typeof backstories.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Style = typeof styles.$inferSelect;
export type Platform = typeof platforms.$inferSelect;
export type Canvas = typeof canvas.$inferSelect;
export type PipelineNode = typeof pipelineNodes.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;

