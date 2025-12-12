package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewSchema creates a new GraphQL schema
func NewSchema(pool *pgxpool.Pool) (*graphql.Schema, error) {
	resolver := NewResolver(pool)

	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    resolver.Query(),
		Mutation: resolver.Mutation(),
	})
	if err != nil {
		return nil, err
	}

	return &schema, nil
}

// GraphQL Types

// ProjectType represents a storyboard project
var ProjectType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Project",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// StoryboardType represents a storyboard
var StoryboardType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Storyboard",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"projectId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"aspectRatio":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"resolution":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"durationSeconds": &graphql.Field{Type: graphql.Int},
		"numVariations":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"createdAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// SceneType represents a scene in a storyboard
var SceneType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Scene",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"storyboardId":     &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"sceneNumber":      &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"textDescription":  &graphql.Field{Type: graphql.String},
		"mediaType":        &graphql.Field{Type: graphql.String},
		"mediaUrl":         &graphql.Field{Type: graphql.String},
		"startTimeSeconds": &graphql.Field{Type: graphql.Float},
		"durationSeconds":  &graphql.Field{Type: graphql.Float},
		"transitionType":   &graphql.Field{Type: graphql.String},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// VideoStatusType represents a generated video status
var VideoStatusType = graphql.NewObject(graphql.ObjectConfig{
	Name: "VideoStatus",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"storyboardId":    &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"variationNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"videoUrl":        &graphql.Field{Type: graphql.String},
		"status":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"errorMessage":    &graphql.Field{Type: graphql.String},
		"createdAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// GeneratedImageType represents a generated image
var GeneratedImageType = graphql.NewObject(graphql.ObjectConfig{
	Name: "GeneratedImage",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"sceneId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"openaiImageId": &graphql.Field{Type: graphql.String},
		"imageFormat":   &graphql.Field{Type: graphql.String},
		"imageType":     &graphql.Field{Type: graphql.String},
		"prompt":        &graphql.Field{Type: graphql.String},
		"model":         &graphql.Field{Type: graphql.String},
		"createdAt":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// OperationHistoryType represents operation history
var OperationHistoryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "OperationHistory",
	Fields: graphql.Fields{
		"id":            &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"entityType":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"entityId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"operationType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"operationData": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"userId":        &graphql.Field{Type: graphql.ID},
		"createdAt":     &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// CharacterType represents a character
var CharacterType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Character",
	Fields: graphql.Fields{
		"id":                 &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"projectId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"name":               &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description":        &graphql.Field{Type: graphql.String},
		"personality":        &graphql.Field{Type: graphql.String},
		"background":         &graphql.Field{Type: graphql.String},
		"defaultHumeVoiceId": &graphql.Field{Type: graphql.String},
		"profileImageId":     &graphql.Field{Type: graphql.ID},
		"createdAt":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// CharacterAssetType represents a character asset
var CharacterAssetType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CharacterAsset",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"characterId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"assetType":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"assetFormat": &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// DialogueType represents a dialogue
var DialogueType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Dialogue",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"sceneId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"characterId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"language":         &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"text":             &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"translatedText":   &graphql.Field{Type: graphql.String},
		"humeVoiceId":      &graphql.Field{Type: graphql.String},
		"audioUrl":         &graphql.Field{Type: graphql.String},
		"startTimeSeconds": &graphql.Field{Type: graphql.Float},
		"durationSeconds":  &graphql.Field{Type: graphql.Float},
		"orderIndex":       &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// HumeVoiceType represents a Hume AI voice
var HumeVoiceType = graphql.NewObject(graphql.ObjectConfig{
	Name: "HumeVoice",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"name":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"language":    &graphql.Field{Type: graphql.String},
	},
})

// ComposerType represents a composer
var ComposerType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Composer",
	Fields: graphql.Fields{
		"id":              &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"projectId":       &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":           &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"durationSeconds": &graphql.Field{Type: graphql.Float},
		"createdAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// AudioTrackType represents an audio track
var AudioTrackType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AudioTrack",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"composerId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"trackNumber": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"trackType":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"name":        &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// AudioClipType represents an audio clip
var AudioClipType = graphql.NewObject(graphql.ObjectConfig{
	Name: "AudioClip",
	Fields: graphql.Fields{
		"id":               &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"trackId":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"startTimeSeconds": &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"durationSeconds":  &graphql.Field{Type: graphql.NewNonNull(graphql.Float)},
		"audioType":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"audioUrl":         &graphql.Field{Type: graphql.String},
		"audioDataId":      &graphql.Field{Type: graphql.ID},
		"metadata":         &graphql.Field{Type: graphql.String},
		"createdAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":        &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// SunoMusicType represents Suno AI generated music
var SunoMusicType = graphql.NewObject(graphql.ObjectConfig{
	Name: "SunoMusic",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"composerId":  &graphql.Field{Type: graphql.ID},
		"prompt":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"status":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"audioUrl":    &graphql.Field{Type: graphql.String},
		"audioDataId": &graphql.Field{Type: graphql.ID},
		"taskId":      &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// ScenarioType represents a scenario
var ScenarioType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Scenario",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"projectId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// EpisodeType represents an episode
var EpisodeType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Episode",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"scenarioId":  &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"orderIndex":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// PartType represents a part within an episode
var PartType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Part",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"episodeId":   &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":       &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"description": &graphql.Field{Type: graphql.String},
		"orderIndex":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

// ScenePlanType represents a scene plan
var ScenePlanType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ScenePlan",
	Fields: graphql.Fields{
		"id":          &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"partId":      &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"description": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"orderIndex":  &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
		"createdAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"updatedAt":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})
