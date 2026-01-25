package workflows

import (
	"fmt"
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// VideoGenerationWorkflowInput is the input for the video generation workflow
type VideoGenerationWorkflowInput struct {
	StoryboardID string
	Provider     string // "runway" or "suno"
	Params       map[string]interface{}
	OrgID        string
}

// VideoGenerationWorkflowResult is the result of the video generation workflow
type VideoGenerationWorkflowResult struct {
	VideoID    string
	ProviderID string
	VideoURL   string
	Status     string
	Duration   int32
	Params     map[string]interface{}
}

// VideoGenerationWorkflow handles video generation using Runway or Suno
func VideoGenerationWorkflow(ctx workflow.Context, input VideoGenerationWorkflowInput) (*VideoGenerationWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("VideoGenerationWorkflow started", "storyboardID", input.StoryboardID, "provider", input.Provider)

	// Set activity options
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    2 * time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Generate video based on provider
	var result VideoGenerationWorkflowResult
	var err error

	switch input.Provider {
	case "runway":
		// Start video generation
		err = workflow.ExecuteActivity(ctx, "GenerateVideoRunwayActivity", input).Get(ctx, &result)
		if err != nil {
			logger.Error("Failed to start video generation", "error", err)
			return nil, err
		}

		// Poll for completion with exponential backoff
		pollOptions := workflow.ActivityOptions{
			StartToCloseTimeout: 30 * time.Second,
			RetryPolicy: &temporal.RetryPolicy{
				InitialInterval:    5 * time.Second,
				BackoffCoefficient: 1.5,
				MaximumInterval:    2 * time.Minute,
				MaximumAttempts:    60, // Poll for up to 30 minutes (60 * 30s)
			},
		}
		pollCtx := workflow.WithActivityOptions(ctx, pollOptions)

		// Poll until completion
		for result.Status != "completed" && result.Status != "failed" {
			workflow.Sleep(ctx, 5*time.Second) // Wait before polling

			var pollResult VideoGenerationWorkflowResult
			err = workflow.ExecuteActivity(pollCtx, "PollVideoTaskStatusActivity", result.ProviderID, input.Provider).Get(ctx, &pollResult)
			if err != nil {
				logger.Warn("Failed to poll task status", "error", err)
				// Continue polling on error
				continue
			}

			result.Status = pollResult.Status
			result.VideoURL = pollResult.VideoURL
			if pollResult.Status == "failed" {
				result.ProviderID = pollResult.ProviderID // Error message might be in ProviderID
			}

			// Update database with current status
			_ = workflow.ExecuteActivity(ctx, "UpdateVideoStatusActivity", result, input.StoryboardID).Get(ctx, nil)
		}

	case "suno":
		err = workflow.ExecuteActivity(ctx, "GenerateVideoSunoActivity", input).Get(ctx, &result)
		if err != nil {
			logger.Error("Failed to generate video", "error", err)
			return nil, err
		}

		// Suno also requires polling
		pollOptions := workflow.ActivityOptions{
			StartToCloseTimeout: 30 * time.Second,
			RetryPolicy: &temporal.RetryPolicy{
				InitialInterval:    10 * time.Second,
				BackoffCoefficient: 1.5,
				MaximumInterval:    2 * time.Minute,
				MaximumAttempts:    30, // Poll for up to 15 minutes
			},
		}
		pollCtx := workflow.WithActivityOptions(ctx, pollOptions)

		for result.Status != "completed" && result.Status != "failed" {
			workflow.Sleep(ctx, 10*time.Second)

			var pollResult VideoGenerationWorkflowResult
			err = workflow.ExecuteActivity(pollCtx, "PollVideoTaskStatusActivity", result.ProviderID, input.Provider).Get(ctx, &pollResult)
			if err != nil {
				logger.Warn("Failed to poll task status", "error", err)
				continue
			}

			result.Status = pollResult.Status
			result.VideoURL = pollResult.VideoURL
			_ = workflow.ExecuteActivity(ctx, "UpdateVideoStatusActivity", result, input.StoryboardID).Get(ctx, nil)
		}

	default:
		logger.Error("Unknown video generation provider", "provider", input.Provider)
		return nil, fmt.Errorf("unknown video generation provider: %s", input.Provider)
	}

	if result.Status == "failed" {
		logger.Error("Video generation failed", "providerID", result.ProviderID)
		return nil, fmt.Errorf("video generation failed: %s", result.ProviderID)
	}

	// Save final result to database
	workflowInfo := workflow.GetInfo(ctx)
	var videoID string
	err = workflow.ExecuteActivity(ctx, "SaveGeneratedVideoActivity", result, input.StoryboardID, input.OrgID, workflowInfo.WorkflowExecution.ID, workflowInfo.WorkflowExecution.RunID).Get(ctx, &videoID)
	if err != nil {
		logger.Error("Failed to save generated video", "error", err)
		return nil, err
	}

	result.VideoID = videoID
	logger.Info("VideoGenerationWorkflow completed", "videoID", result.VideoID)
	return &result, nil
}
