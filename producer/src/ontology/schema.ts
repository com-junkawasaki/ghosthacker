import { Type, Static } from '@sinclair/typebox';

const IRI = Type.String({ format: 'uri', $id: 'iri' });

const GHOntology = 'gh:';
const SchemaOrg = 'schema:';

const CharacterType = Type.Literal(`${GHOntology}Character`);
const ProjectType = Type.Literal(`${GHOntology}Project`);
const EpisodeType = Type.Literal(`${GHOntology}Episode`);
const SceneType = Type.Literal(`${GHOntology}Scene`);
const SettingType = Type.Literal(`${GHOntology}Setting`);


export const BaseSchema = Type.Object({
  '@id': IRI,
});

export const CharacterSchema = Type.Intersect([
  BaseSchema,
  Type.Object({
    '@type': CharacterType,
    [`${SchemaOrg}name`]: Type.String(),
    [`${GHOntology}role`]: Type.Optional(Type.String()),
    [`${GHOntology}age`]: Type.Optional(Type.Number()),
    [`${GHOntology}occupation`]: Type.Optional(Type.String()),
    [`${GHOntology}relation_to_tamaki`]: Type.Optional(Type.String()),
    [`${GHOntology}creator`]: Type.Optional(Type.String()),
    [`${GHOntology}type`]: Type.Optional(Type.String()),
    [`${GHOntology}background`]: Type.Optional(Type.String()),
    [`${GHOntology}core_conflict`]: Type.Optional(Type.String()),
    [`${GHOntology}has_master`]: Type.Optional(Type.String()),
    [`${GHOntology}motif`]: Type.Optional(Type.String()),
  }),
]);
export type Character = Static<typeof CharacterSchema>;

export const ProjectSchema = Type.Intersect([
  BaseSchema,
  Type.Object({
    '@type': ProjectType,
    [`${SchemaOrg}name`]: Type.String(),
    [`${GHOntology}version`]: Type.Optional(Type.String()),
    [`${GHOntology}theme`]: Type.Optional(Type.String()),
    [`${GHOntology}writing_style`]: Type.Optional(Type.String()),
    [`${GHOntology}has_character`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
    [`${GHOntology}has_episode`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
    [`${GHOntology}has_setting`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
  }),
]);
export type Project = Static<typeof ProjectSchema>;

export const EpisodeSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': EpisodeType,
        [`${SchemaOrg}title`]: Type.String(),
    }),
]);
export type Episode = Static<typeof EpisodeSchema>;

export const SceneSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': SceneType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${GHOntology}duration`]: Type.Optional(Type.String()),
        [`${GHOntology}location_prompt`]: Type.Optional(Type.String()),
    }),
]);
export type Scene = Static<typeof SceneSchema>;


export const SettingSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': SettingType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
    }),
]);
export type Setting = Static<typeof SettingSchema>;
