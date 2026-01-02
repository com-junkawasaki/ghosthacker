package activities

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/services"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
)

// GenerationActivityHandler contains dependencies for generation activities
type GenerationActivityHandler struct {
	pool       *pgxpool.Pool
	queries    *sqlc.Queries
	openai     *services.OpenAIService
	higgsfield *services.HiggsfieldService
	hume       *services.HumeService
	runway     *services.RunwayService
	suno       *services.SunoService
}

// NewGenerationActivityHandler creates a new generation activity handler
func NewGenerationActivityHandler(pool *pgxpool.Pool) *GenerationActivityHandler {
	queries := sqlc.New(pool)

	openai, _ := services.NewOpenAIService()
	higgsfield, _ := services.NewHiggsfieldService()
	hume, _ := services.NewHumeService()
	runway, _ := services.NewRunwayService()
	suno, _ := services.NewSunoService()

	return &GenerationActivityHandler{
		pool:       pool,
		queries:    queries,
		openai:     openai,
		higgsfield: higgsfield,
		hume:       hume,
		runway:     runway,
		suno:       suno,
	}
}

// GenerateImageActivity generates an image using OpenAI or Higgsfield
func (h *GenerationActivityHandler) GenerateImageActivity(ctx context.Context, input workflows.ImageGenerationWorkflowInput) (*workflows.ImageGenerationWorkflowResult, error) {
	log.Printf("GenerateImageActivity: sceneID=%s, model=%s, provider=%s", input.SceneID, input.Model, input.Provider)

	provider := input.Provider
	if provider == "" {
		provider = "openai" // Default to OpenAI
	}

	var result *services.GeneratedImageResult
	var err error

	switch provider {
	case "higgsfield":
		if h.higgsfield == nil {
			return nil, fmt.Errorf("Higgsfield service is not available")
		}
		// Generate image using Higgsfield service
		higgsResult, err := h.higgsfield.GenerateImage(ctx, input.Prompt, "", "", nil)
		if err != nil {
			return nil, fmt.Errorf("failed to generate image with Higgsfield: %w", err)
		}
		return &workflows.ImageGenerationWorkflowResult{
			ImageData:       higgsResult.ImageData,
			ImageFormat:     higgsResult.ImageFormat,
			Prompt:          higgsResult.Prompt,
			Model:           higgsResult.Model,
			ImageType:       "start",
			Provider:        "higgsfield",
			ExternalImageID: higgsResult.TaskID,
			CharacterID:     input.CharacterID,
		}, nil

	case "openai", "":
		if h.openai == nil {
			return nil, fmt.Errorf("OpenAI service is not available")
		}
		model := input.Model
		if model == "" {
			model = "dall-e-3"
		}
		// Generate image using OpenAI service
		result, err = h.openai.GenerateImage(ctx, input.Prompt, model, "")
		if err != nil {
			return nil, fmt.Errorf("failed to generate image: %w", err)
		}
		return &workflows.ImageGenerationWorkflowResult{
			ImageData:       result.ImageData,
			ImageFormat:     result.ImageFormat,
			Prompt:          result.Prompt,
			Model:           result.Model,
			ImageType:       "start",
			Provider:        "openai",
			ExternalImageID: result.RevisedPrompt, // Using revised prompt as ID placeholder
			CharacterID:     input.CharacterID,
		}, nil

	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

// SaveGeneratedImageActivity saves a generated image to the database
func (h *GenerationActivityHandler) SaveGeneratedImageActivity(ctx context.Context, result workflows.ImageGenerationWorkflowResult, sceneID, orgID, characterID string) (string, error) {
	log.Printf("SaveGeneratedImageActivity: sceneID=%s, characterID=%s, provider=%s", sceneID, characterID, result.Provider)

	var sceneUUID pgtype.UUID
	if sceneID != "" {
		parsedUUID, err := uuid.Parse(sceneID)
		if err != nil {
			return "", fmt.Errorf("invalid scene ID: %w", err)
		}
		sceneUUID = pgtype.UUID{Bytes: parsedUUID, Valid: true}
	}

	var charUUID pgtype.UUID
	if characterID != "" {
		parsedUUID, err := uuid.Parse(characterID)
		if err != nil {
			return "", fmt.Errorf("invalid character ID: %w", err)
		}
		charUUID = pgtype.UUID{Bytes: parsedUUID, Valid: true}
	}

	orgIDPg := pgtype.Text{}
	if orgID != "" {
		orgIDPg = pgtype.Text{String: orgID, Valid: true}
	}

	provider := result.Provider
	if provider == "" {
		provider = "openai" // Default
	}

	externalImageID := pgtype.Text{}
	if result.ExternalImageID != "" {
		externalImageID = pgtype.Text{String: result.ExternalImageID, Valid: true}
	}

	imageFormat := pgtype.Text{}
	if result.ImageFormat != "" {
		imageFormat = pgtype.Text{String: result.ImageFormat, Valid: true}
	}

	imageType := pgtype.Text{String: result.ImageType, Valid: true}
	prompt := pgtype.Text{String: result.Prompt, Valid: true}
	model := pgtype.Text{String: result.Model, Valid: true}

	image, err := h.queries.CreateGeneratedImage(ctx, sqlc.CreateGeneratedImageParams{
		SceneID:         sceneUUID,
		Provider:        pgtype.Text{String: provider, Valid: true},
		ExternalImageID: externalImageID,
		ImageData:       result.ImageData,
		ImageFormat:     imageFormat,
		ImageType:       imageType,
		Prompt:          prompt,
		Model:           model,
		CharacterID:     charUUID,
		OrgID:           orgIDPg,
	})
	if err != nil {
		return "", fmt.Errorf("failed to save generated image: %w", err)
	}

	return image.ID.String(), nil
}

// GetCharacterReferenceImagesActivity retrieves reference images for a character
func (h *GenerationActivityHandler) GetCharacterReferenceImagesActivity(ctx context.Context, characterID string) ([][]byte, error) {
	log.Printf("GetCharacterReferenceImagesActivity: characterID=%s", characterID)

	charUUID, err := uuid.Parse(characterID)
	if err != nil {
		return nil, fmt.Errorf("invalid character ID: %w", err)
	}

	// Get character assets (images)
	assets, err := h.queries.ListCharacterAssets(ctx, pgtype.UUID{Bytes: charUUID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list character assets: %w", err)
	}

	referenceImages := make([][]byte, 0)
	for _, asset := range assets {
		if asset.AssetType == "image" {
			assetData, err := h.queries.GetCharacterAssetData(ctx, asset.ID)
			if err != nil {
				log.Printf("Failed to get asset data for %s: %v", asset.ID, err)
				continue
			}
			referenceImages = append(referenceImages, assetData.AssetData)
			// Limit to 5 reference images for Soul ID
			if len(referenceImages) >= 5 {
				break
			}
		}
	}

	return referenceImages, nil
}

// GenerateCharacterImageActivity generates a character image using Higgsfield Soul ID
func (h *GenerationActivityHandler) GenerateCharacterImageActivity(ctx context.Context, input map[string]interface{}) (*workflows.ImageGenerationWorkflowResult, error) {
	workflowInput, _ := input["input"].(workflows.ImageGenerationWorkflowInput)
	referenceImages, _ := input["referenceImages"].([][]byte)
	style, _ := input["style"].(string)
	aspectRatio, _ := input["aspectRatio"].(string)

	log.Printf("GenerateCharacterImageActivity: characterID=%s, style=%s", workflowInput.CharacterID, style)

	if h.higgsfield == nil {
		return nil, fmt.Errorf("Higgsfield service is not available")
	}

	// Generate character image using Higgsfield Soul ID
	higgsResult, err := h.higgsfield.GenerateCharacterImage(ctx, workflowInput.Prompt, referenceImages, style, aspectRatio)
	if err != nil {
		return nil, fmt.Errorf("failed to generate character image: %w", err)
	}

	return &workflows.ImageGenerationWorkflowResult{
		ImageData:       higgsResult.ImageData,
		ImageFormat:     higgsResult.ImageFormat,
		Prompt:          higgsResult.Prompt,
		Model:           higgsResult.Model,
		ImageType:       "character",
		Provider:        "higgsfield",
		ExternalImageID: higgsResult.TaskID,
		CharacterID:     workflowInput.CharacterID,
	}, nil
}

// GenerateVideoRunwayActivity generates a video using Runway
func (h *GenerationActivityHandler) GenerateVideoRunwayActivity(ctx context.Context, input workflows.VideoGenerationWorkflowInput) (*workflows.VideoGenerationWorkflowResult, error) {
	log.Printf("GenerateVideoRunwayActivity: storyboardID=%s", input.StoryboardID)

	if h.runway == nil {
		return nil, fmt.Errorf("Runway service is not available")
	}

	// Extract parameters
	promptText, _ := input.Params["promptText"].(string)
	model, _ := input.Params["model"].(string)
	duration, _ := input.Params["duration"].(float64)
	aspectRatio, _ := input.Params["aspectRatio"].(string)
	promptImageURL, _ := input.Params["promptImageUrl"].(string)

	if model == "" {
		model = "gen3a_turbo"
	}
	if duration == 0 {
		duration = 5
	}

	runwayReq := &services.RunwayGenerateRequest{
		PromptText: promptText,
		Model:      model,
		Duration:   int(duration),
	}

	if promptImageURL != "" {
		runwayReq.PromptImage = &promptImageURL
	}
	if aspectRatio != "" {
		runwayReq.AspectRatio = aspectRatio
	}

	// Generate video with Runway
	result, err := h.runway.GenerateVideo(ctx, runwayReq)
	if err != nil {
		return nil, fmt.Errorf("failed to generate video: %w", err)
	}

	videoURL := ""
	if len(result.VideoURLs) > 0 {
		videoURL = result.VideoURLs[0]
	}

	// Map Runway status to workflow status
	status := "pending"
	switch result.Status {
	case "PENDING", "RUNNING":
		status = "processing"
	case "SUCCEEDED":
		status = "completed"
	case "FAILED":
		status = "failed"
	}

	return &workflows.VideoGenerationWorkflowResult{
		ProviderID: result.TaskID,
		VideoURL:   videoURL,
		Status:     status,
		Duration:   int32(runwayReq.Duration),
		Params:     input.Params,
	}, nil
}

// GenerateVideoSunoActivity generates a video using Suno (for audio)
func (h *GenerationActivityHandler) GenerateVideoSunoActivity(ctx context.Context, input workflows.VideoGenerationWorkflowInput) (*workflows.VideoGenerationWorkflowResult, error) {
	log.Printf("GenerateVideoSunoActivity: storyboardID=%s", input.StoryboardID)

	if h.suno == nil {
		return nil, fmt.Errorf("Suno service is not available")
	}

	// Extract parameters
	prompt, _ := input.Params["prompt"].(string)
	if prompt == "" {
		return nil, fmt.Errorf("prompt is required for Suno generation")
	}

	// Generate music with Suno
	result, err := h.suno.GenerateMusic(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate music: %w", err)
	}

	audioURL := ""
	if result.AudioURL != nil {
		audioURL = *result.AudioURL
	}

	// Map Suno status to workflow status
	status := "pending"
	switch result.Status {
	case "pending", "processing":
		status = "processing"
	case "completed":
		status = "completed"
	case "failed":
		status = "failed"
	}

	return &workflows.VideoGenerationWorkflowResult{
		ProviderID: result.TaskID,
		VideoURL:   audioURL,
		Status:     status,
		Duration:   0, // Suno doesn't specify duration upfront
		Params:     input.Params,
	}, nil
}

// SaveGeneratedVideoActivity saves a generated video to the database
func (h *GenerationActivityHandler) SaveGeneratedVideoActivity(ctx context.Context, result workflows.VideoGenerationWorkflowResult, storyboardID, orgID, workflowID, runID string) (string, error) {
	log.Printf("SaveGeneratedVideoActivity: storyboardID=%s, providerID=%s", storyboardID, result.ProviderID)

	storyboardUUID, err := uuid.Parse(storyboardID)
	if err != nil {
		return "", fmt.Errorf("invalid storyboard ID: %w", err)
	}

	orgIDPg := pgtype.Text{}
	if orgID != "" {
		orgIDPg = pgtype.Text{String: orgID, Valid: true}
	}

	paramsJSON, err := json.Marshal(result.Params)
	if err != nil {
		return "", fmt.Errorf("failed to marshal parameters: %w", err)
	}

	providerID := pgtype.Text{String: result.ProviderID, Valid: true}

	duration := pgtype.Int4{}
	if result.Duration > 0 {
		duration = pgtype.Int4{Int32: result.Duration, Valid: true}
	}

	// Determine provider type from result
	provider := "runway"
	if result.ProviderID != "" && len(result.ProviderID) < 20 {
		provider = "suno" // Suno IDs are typically shorter
	}

	// Determine model from params
	model := pgtype.Text{}
	if modelStr, ok := result.Params["model"].(string); ok && modelStr != "" {
		model = pgtype.Text{String: modelStr, Valid: true}
	}

	var videoID string
	if provider == "runway" {
		video, err := h.queries.CreateGeneratedVideoRunway(ctx, sqlc.CreateGeneratedVideoRunwayParams{
			StoryboardID:     pgtype.UUID{Bytes: storyboardUUID, Valid: true},
			VariationNumber:  pgtype.Int4{Int32: 1, Valid: true}, // Default to variation 1
			Status:           result.Status,
			OrgID:            orgIDPg,
			RunwayTaskID:     providerID,
			Model:            model,
			Duration:         duration,
			GenerationParams: paramsJSON,
		})
		if err != nil {
			return "", fmt.Errorf("failed to save generated video: %w", err)
		}
		videoID = uuid.UUID(video.ID.Bytes).String()

		// Update with workflow info if available
		if workflowID != "" {
			_, err = h.pool.Exec(ctx, `
				UPDATE generated_videos_runway 
				SET workflow_id = $1, run_id = $2 
				WHERE id = $3
			`, workflowID, runID, video.ID)
			if err != nil {
				log.Printf("Failed to update workflow info: %v", err)
			}
		}
	} else {
		// For Suno or other providers, use Runway table as fallback
		video, err := h.queries.CreateGeneratedVideoRunway(ctx, sqlc.CreateGeneratedVideoRunwayParams{
			StoryboardID:     pgtype.UUID{Bytes: storyboardUUID, Valid: true},
			VariationNumber:  pgtype.Int4{Int32: 1, Valid: true},
			Status:           result.Status,
			OrgID:            orgIDPg,
			RunwayTaskID:     providerID,
			Model:            model,
			Duration:         duration,
			GenerationParams: paramsJSON,
		})
		if err != nil {
			return "", fmt.Errorf("failed to save generated video: %w", err)
		}
		videoID = uuid.UUID(video.ID.Bytes).String()

		// Update with workflow info if available
		if workflowID != "" {
			_, err = h.pool.Exec(ctx, `
				UPDATE generated_videos_runway 
				SET workflow_id = $1, run_id = $2 
				WHERE id = $3
			`, workflowID, runID, video.ID)
			if err != nil {
				log.Printf("Failed to update workflow info: %v", err)
			}
		}
	}

	return videoID, nil
}

// PollVideoTaskStatusActivity polls the status of a video generation task
func (h *GenerationActivityHandler) PollVideoTaskStatusActivity(ctx context.Context, taskID, provider string) (*workflows.VideoGenerationWorkflowResult, error) {
	log.Printf("PollVideoTaskStatusActivity: taskID=%s, provider=%s", taskID, provider)

	switch provider {
	case "runway":
		if h.runway == nil {
			return nil, fmt.Errorf("Runway service is not available")
		}

		result, err := h.runway.GetTaskStatus(ctx, taskID)
		if err != nil {
			return nil, fmt.Errorf("failed to get task status: %w", err)
		}

		videoURL := ""
		if len(result.VideoURLs) > 0 {
			videoURL = result.VideoURLs[0]
		}

		status := "processing"
		switch result.Status {
		case "SUCCEEDED":
			status = "completed"
		case "FAILED":
			status = "failed"
		}

		errorMsg := ""
		if result.Error != nil {
			errorMsg = *result.Error
		}

		return &workflows.VideoGenerationWorkflowResult{
			ProviderID: taskID,
			VideoURL:   videoURL,
			Status:     status,
			Params:     map[string]interface{}{"error": errorMsg},
		}, nil

	case "suno":
		if h.suno == nil {
			return nil, fmt.Errorf("Suno service is not available")
		}

		result, err := h.suno.GetTaskStatus(ctx, taskID)
		if err != nil {
			return nil, fmt.Errorf("failed to get task status: %w", err)
		}

		audioURL := ""
		if result.AudioURL != nil {
			audioURL = *result.AudioURL
		}

		status := "processing"
		switch result.Status {
		case "completed":
			status = "completed"
		case "failed":
			status = "failed"
		}

		errorMsg := ""
		if result.Error != nil {
			errorMsg = *result.Error
		}

		return &workflows.VideoGenerationWorkflowResult{
			ProviderID: taskID,
			VideoURL:   audioURL,
			Status:     status,
			Params:     map[string]interface{}{"error": errorMsg},
		}, nil

	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}
}

// UpdateVideoStatusActivity updates video status in database
func (h *GenerationActivityHandler) UpdateVideoStatusActivity(ctx context.Context, result workflows.VideoGenerationWorkflowResult, storyboardID string) error {
	log.Printf("UpdateVideoStatusActivity: storyboardID=%s, status=%s", storyboardID, result.Status)

	storyboardUUID, err := uuid.Parse(storyboardID)
	if err != nil {
		return fmt.Errorf("invalid storyboard ID: %w", err)
	}

	// Find video by provider ID
	var videoID pgtype.UUID
	err = h.pool.QueryRow(ctx, `
		SELECT id FROM generated_videos_runway 
		WHERE storyboard_id = $1 AND runway_task_id = $2
	`, storyboardUUID, result.ProviderID).Scan(&videoID)
	if err != nil {
		// Video not found, skip update
		return nil
	}

	videoURL := pgtype.Text{}
	if result.VideoURL != "" {
		videoURL = pgtype.Text{String: result.VideoURL, Valid: true}
	}

	errorMsg := pgtype.Text{}
	if errMsg, ok := result.Params["error"].(string); ok && errMsg != "" {
		errorMsg = pgtype.Text{String: errMsg, Valid: true}
	}

	_, err = h.queries.UpdateGeneratedVideoRunwayStatus(ctx, sqlc.UpdateGeneratedVideoRunwayStatusParams{
		RunwayTaskID: pgtype.Text{String: result.ProviderID, Valid: true},
		Status:       result.Status,
		VideoUrl:     videoURL,
		ErrorMessage: errorMsg,
	})
	if err != nil {
		return fmt.Errorf("failed to update video status: %w", err)
	}

	return nil
}

// GenerateTextActivity generates text using OpenAI
func (h *GenerationActivityHandler) GenerateTextActivity(ctx context.Context, input workflows.TextGenerationWorkflowInput) (*workflows.TextGenerationWorkflowResult, error) {
	log.Printf("GenerateTextActivity: model=%s", input.Model)

	if h.openai == nil {
		return nil, fmt.Errorf("OpenAI service is not available")
	}

	// OpenAI text generation would go here
	// For now, return error as it's not yet implemented in OpenAI service
	return nil, fmt.Errorf("text generation not yet implemented")
}

// AnalyzeEmotionsActivity analyzes emotions in text using Hume
func (h *GenerationActivityHandler) AnalyzeEmotionsActivity(ctx context.Context, input workflows.EmotionAnalysisWorkflowInput) (*workflows.EmotionAnalysisWorkflowResult, error) {
	log.Printf("AnalyzeEmotionsActivity: nodeID=%s, nodeType=%s", input.NodeID, input.NodeType)

	if h.hume == nil {
		return nil, fmt.Errorf("Hume service is not available")
	}

	// Hume emotion analysis would go here
	// For now, return error as it's not yet implemented
	return nil, fmt.Errorf("emotion analysis not yet implemented")
}

// SaveEmotionAnalysisActivity saves emotion analysis to database
func (h *GenerationActivityHandler) SaveEmotionAnalysisActivity(ctx context.Context, result workflows.EmotionAnalysisWorkflowResult, nodeID, nodeType string) error {
	log.Printf("SaveEmotionAnalysisActivity: nodeID=%s", nodeID)

	// Save emotion analysis to jsonld_nodes table
	// Implementation would go here
	return nil
}

// ExportEpubActivity exports novel as EPUB
func (h *GenerationActivityHandler) ExportEpubActivity(ctx context.Context, input workflows.EpubExportWorkflowInput) (*workflows.EpubExportWorkflowResult, error) {
	log.Printf("ExportEpubActivity: novelProjectID=%s", input.NovelProjectID)

	// EPUB export implementation would go here
	return nil, fmt.Errorf("EPUB export not yet implemented")
}

// ImportEpubActivity imports novel from EPUB
func (h *GenerationActivityHandler) ImportEpubActivity(ctx context.Context, input workflows.EpubImportWorkflowInput) (*workflows.EpubImportWorkflowResult, error) {
	log.Printf("ImportEpubActivity: novelProjectID=%s", input.NovelProjectID)

	// EPUB import implementation would go here
	return nil, fmt.Errorf("EPUB import not yet implemented")
}

// GenerateDialogueAudioActivity generates dialogue audio using Hume
func (h *GenerationActivityHandler) GenerateDialogueAudioActivity(ctx context.Context, input workflows.AudioGenerationWorkflowInput) (*workflows.AudioGenerationWorkflowResult, error) {
	log.Printf("GenerateDialogueAudioActivity: dialogueID=%s, voiceID=%s", input.DialogueID, input.VoiceID)

	if h.hume == nil {
		return nil, fmt.Errorf("Hume service is not available")
	}

	// Generate audio using Hume service
	result, err := h.hume.GenerateSpeech(ctx, input.Text, input.VoiceID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate audio: %w", err)
	}

	return &workflows.AudioGenerationWorkflowResult{
		AudioData:  result.AudioData,
		AudioURL:   "", // Hume doesn't provide URL, only data
		Duration:   result.Duration,
		DialogueID: input.DialogueID,
	}, nil
}

// SaveDialogueAudioActivity saves generated audio to database
func (h *GenerationActivityHandler) SaveDialogueAudioActivity(ctx context.Context, result workflows.AudioGenerationWorkflowResult, dialogueID string) error {
	log.Printf("SaveDialogueAudioActivity: dialogueID=%s", dialogueID)

	dialogueUUID, err := uuid.Parse(dialogueID)
	if err != nil {
		return fmt.Errorf("invalid dialogue ID: %w", err)
	}

	audioURL := pgtype.Text{Valid: false}
	if result.AudioURL != "" {
		audioURL = pgtype.Text{String: result.AudioURL, Valid: true}
	}

	duration := pgtype.Numeric{Valid: false}
	if result.Duration > 0 {
		// Convert float64 to pgtype.Numeric
		duration.Scan(result.Duration)
		duration.Valid = true
	}

	_, err = h.queries.UpdateDialogueAudio(ctx, sqlc.UpdateDialogueAudioParams{
		ID:              pgtype.UUID{Bytes: dialogueUUID, Valid: true},
		AudioData:       result.AudioData,
		AudioUrl:        audioURL,
		DurationSeconds: duration,
	})
	if err != nil {
		return fmt.Errorf("failed to save dialogue audio: %w", err)
	}

	return nil
}
