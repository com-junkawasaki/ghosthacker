package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// ImageGenerationWorkflowInput is the input for the image generation workflow
type ImageGenerationWorkflowInput struct {
	SceneID     string
	Prompt      string
	Model       string
	Provider    string // "openai", "higgsfield"
	OrgID       string
	CharacterID string // Optional: for character-specific generation
}

// ImageGenerationWorkflowResult is the result of the image generation workflow
type ImageGenerationWorkflowResult struct {
	ImageID         string
	Provider        string
	ExternalImageID string // Provider-specific image ID (replaces OpenaiImageID)
	ImageData       []byte
	ImageFormat     string
	ImageType       string
	Prompt          string
	Model           string
	CharacterID     string // Optional: associated character ID
}

// ImageGenerationWorkflow handles image generation using OpenAI or Higgsfield
func ImageGenerationWorkflow(ctx workflow.Context, input ImageGenerationWorkflowInput) (*ImageGenerationWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("ImageGenerationWorkflow started", "sceneID", input.SceneID, "model", input.Model, "provider", input.Provider)

	// Set activity options
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute, // Increased for Higgsfield polling
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Generate image
	var result ImageGenerationWorkflowResult
	err := workflow.ExecuteActivity(ctx, "GenerateImageActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to generate image", "error", err)
		return nil, err
	}

	// Save to database
	var imageID string
	err = workflow.ExecuteActivity(ctx, "SaveGeneratedImageActivity", result, input.SceneID, input.OrgID, input.CharacterID).Get(ctx, &imageID)
	if err != nil {
		logger.Error("Failed to save generated image", "error", err)
		return nil, err
	}

	result.ImageID = imageID
	logger.Info("ImageGenerationWorkflow completed", "imageID", result.ImageID)
	return &result, nil
}

// CharacterImageGenerationWorkflowInput is the input for character image generation workflow
type CharacterImageGenerationWorkflowInput struct {
	CharacterID string
	Prompt      string
	Style       string
	AspectRatio string
	OrgID       string
}

// CharacterImageGenerationWorkflow handles character image generation using Higgsfield Soul ID
func CharacterImageGenerationWorkflow(ctx workflow.Context, input CharacterImageGenerationWorkflowInput) (*ImageGenerationWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("CharacterImageGenerationWorkflow started", "characterID", input.CharacterID)

	// Set activity options
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Get character reference images
	var referenceImages [][]byte
	err := workflow.ExecuteActivity(ctx, "GetCharacterReferenceImagesActivity", input.CharacterID).Get(ctx, &referenceImages)
	if err != nil {
		logger.Error("Failed to get character reference images", "error", err)
		return nil, err
	}

	// Generate character image using Higgsfield
	genInput := ImageGenerationWorkflowInput{
		Prompt:      input.Prompt,
		Model:       "higgsfield",
		Provider:    "higgsfield",
		OrgID:       input.OrgID,
		CharacterID: input.CharacterID,
	}

	var result ImageGenerationWorkflowResult
	genActivityInput := map[string]interface{}{
		"input":           genInput,
		"referenceImages": referenceImages,
		"style":           input.Style,
		"aspectRatio":     input.AspectRatio,
	}
	err = workflow.ExecuteActivity(ctx, "GenerateCharacterImageActivity", genActivityInput).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to generate character image", "error", err)
		return nil, err
	}

	result.CharacterID = input.CharacterID
	result.Provider = "higgsfield"

	// Save to database (without scene_id)
	var imageID string
	err = workflow.ExecuteActivity(ctx, "SaveGeneratedImageActivity", result, "", input.OrgID, input.CharacterID).Get(ctx, &imageID)
	if err != nil {
		logger.Error("Failed to save generated character image", "error", err)
		return nil, err
	}

	result.ImageID = imageID
	logger.Info("CharacterImageGenerationWorkflow completed", "imageID", result.ImageID)
	return &result, nil
}
