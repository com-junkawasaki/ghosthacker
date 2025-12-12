package graph

import (
	"github.com/graphql-go/graphql"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Resolver holds the database pool and provides Query/Mutation objects
type Resolver struct {
	pool *pgxpool.Pool
}

// NewResolver creates a new resolver with the given database pool
func NewResolver(pool *pgxpool.Pool) *Resolver {
	return &Resolver{pool: pool}
}

// Query returns the root query object
func (r *Resolver) Query() *graphql.Object {
	return graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"health":             r.healthField(),
			"projects":           r.projectsField(),
			"storyboards":        r.storyboardsField(),
			"scenes":             r.scenesField(),
			"scene":              r.sceneField(),
			"generatedVideos":    r.generatedVideosField(),
			"generatedImages":    r.generatedImagesField(),
			"imageData":          r.imageDataField(),
			"characters":         r.charactersField(),
			"dialogues":          r.dialoguesField(),
			"humeVoices":         r.humeVoicesField(),
			"audioData":          r.audioDataField(),
			"characterAssets":    r.characterAssetsField(),
			"characterAssetData": r.characterAssetDataField(),
			"operationHistory":   r.operationHistoryField(),
			"composers":          r.composersField(),
			"composer":           r.composerField(),
			"audioTracks":        r.audioTracksField(),
			"audioClips":         r.audioClipsField(),
			"sunoMusic":          r.sunoMusicField(),
			"scenarios":          r.scenariosField(),
			"scenario":           r.scenarioField(),
		},
	})
}

// Mutation returns the root mutation object
func (r *Resolver) Mutation() *graphql.Object {
	return graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"createProject":         r.createProjectField(),
			"updateProject":         r.updateProjectField(),
			"deleteProject":         r.deleteProjectField(),
			"createStoryboard":      r.createStoryboardField(),
			"updateStoryboard":      r.updateStoryboardField(),
			"deleteStoryboard":      r.deleteStoryboardField(),
			"createScene":           r.createSceneField(),
			"updateScene":           r.updateSceneField(),
			"deleteScene":           r.deleteSceneField(),
			"generateImage":         r.generateImageField(),
			"createCharacter":       r.createCharacterField(),
			"updateCharacter":       r.updateCharacterField(),
			"deleteCharacter":       r.deleteCharacterField(),
			"createDialogue":        r.createDialogueField(),
			"updateDialogue":        r.updateDialogueField(),
			"deleteDialogue":        r.deleteDialogueField(),
			"generateDialogueAudio": r.generateDialogueAudioField(),
			"createComposer":        r.createComposerField(),
			"updateComposer":        r.updateComposerField(),
			"deleteComposer":        r.deleteComposerField(),
			"createAudioTrack":      r.createAudioTrackField(),
			"createAudioClip":       r.createAudioClipField(),
			"generateSunoMusic":     r.generateSunoMusicField(),
			"createScenario":        r.createScenarioField(),
			"updateScenario":        r.updateScenarioField(),
			"deleteScenario":        r.deleteScenarioField(),
		},
	})
}
