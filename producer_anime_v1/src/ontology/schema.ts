import { Type, type Static } from '@sinclair/typebox';

const IRI = Type.String({ format: 'uri', $id: 'iri' });

const GHOntology = 'gh:';
const SchemaOrg = 'schema:';

const CharacterType = Type.Literal(`${GHOntology}Character`);
const ProjectType = Type.Literal(`${GHOntology}Project`);
const EpisodeType = Type.Literal(`${GHOntology}Episode`);
const SceneType = Type.Literal(`${GHOntology}Scene`);
const SettingType = Type.Literal(`${GHOntology}Setting`);
const ActType = Type.Literal(`${GHOntology}Act`);
const LocationType = Type.Literal(`${GHOntology}Location`);
const EventType = Type.Literal(`${GHOntology}Event`);
const ConceptType = Type.Literal(`${GHOntology}Concept`);


export const GenericNodeSchema = Type.Object({
  '@id': IRI,
  '@type': Type.String(),
});

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

export const MediaObjectSchema = Type.Object({
	"@type": Type.Union([
		Type.Literal(`${SchemaOrg}TextDigitalDocument`),
		Type.Literal(`${SchemaOrg}ImageObject`),
		Type.Literal(`${SchemaOrg}VideoObject`),
		Type.Literal(`${SchemaOrg}AudioObject`),
	]),
	[`${SchemaOrg}contentUrl`]: Type.String({ description: "メディアファイルのパス" }),
	[`${SchemaOrg}name`]: Type.Optional(Type.String({ description: "メディア名" })),
	[`${SchemaOrg}description`]: Type.Optional(Type.String()),
});
export type MediaObject = Static<typeof MediaObjectSchema>;

export const EpisodeSchema = Type.Intersect([
	BaseSchema,
	Type.Object({
		"@type": EpisodeType,
		[`${SchemaOrg}name`]: Type.String(),
		[`${SchemaOrg}episodeNumber`]: Type.String(),
		[`${GHOntology}has_act`]: Type.Optional(
			Type.Array(Type.Object({ "@id": IRI })),
		),
		[`${GHOntology}hasPart`]: Type.Optional(Type.Array(MediaObjectSchema)),
	}),
]);
export type Episode = Static<typeof EpisodeSchema>;

export const ActSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': ActType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${GHOntology}has_scene`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
    }),
]);
export type Act = Static<typeof ActSchema>;

export const SceneSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': SceneType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${GHOntology}textContent`]: Type.String(),
        [`${GHOntology}takes_place_in`]: Type.Optional(Type.Object({ '@id': IRI })),
        [`${GHOntology}includes_event`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
        [`${GHOntology}appears_in`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
        [`${GHOntology}mentions`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
    }),
]);
export type Scene = Static<typeof SceneSchema>;

export const LocationSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': LocationType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
    }),
]);
export type Location = Static<typeof LocationSchema>;

export const EventSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': EventType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
    }),
]);
export type Event = Static<typeof EventSchema>;

export const ConceptSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': ConceptType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
    }),
]);
export type Concept = Static<typeof ConceptSchema>;


export const SettingSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': SettingType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
    }),
]);
export type Setting = Static<typeof SettingSchema>;

// Pipeline-related schemas
const PipelineType = Type.Literal(`${GHOntology}Pipeline`);
const PipelineNodeType = Type.Literal(`${GHOntology}PipelineNode`);
const ResourceRequirementType = Type.Literal(`${GHOntology}ResourceRequirement`);
const OutputSpecificationType = Type.Literal(`${GHOntology}OutputSpecification`);

export const ResourceRequirementSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': ResourceRequirementType,
        [`${GHOntology}cpu_requirement`]: Type.Number(),
        [`${GHOntology}memory_requirement`]: Type.String(),
        [`${GHOntology}timeout_duration`]: Type.String(),
    }),
]);
export type ResourceRequirement = Static<typeof ResourceRequirementSchema>;

export const OutputSpecificationSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': OutputSpecificationType,
        [`${GHOntology}output_format`]: Type.String(),
        [`${GHOntology}output_platform`]: Type.String(),
        [`${GHOntology}config`]: Type.Optional(Type.Any()),
    }),
]);
export type OutputSpecification = Static<typeof OutputSpecificationSchema>;

export const PipelineNodeSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': PipelineNodeType,
        [`${GHOntology}node_type`]: Type.String(),
        [`${GHOntology}node_label`]: Type.String(),
        [`${GHOntology}route`]: Type.Optional(Type.String()),
        [`${GHOntology}config`]: Type.Optional(Type.Any()),
        [`${GHOntology}outputs`]: Type.Optional(Type.Array(Type.String())),
        [`${GHOntology}depends_on`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
        [`${GHOntology}execution_order`]: Type.Optional(Type.Number()),
        [`${GHOntology}requires_resource`]: Type.Optional(Type.Object({ '@id': IRI })),
    }),
]);
export type PipelineNode = Static<typeof PipelineNodeSchema>;

export const PipelineSchema = Type.Intersect([
    BaseSchema,
    Type.Object({
        '@type': PipelineType,
        [`${SchemaOrg}name`]: Type.String(),
        [`${SchemaOrg}description`]: Type.Optional(Type.String()),
        [`${GHOntology}has_node`]: Type.Optional(Type.Array(Type.Object({ '@id': IRI }))),
    }),
]);
export type Pipeline = Static<typeof PipelineSchema>;
