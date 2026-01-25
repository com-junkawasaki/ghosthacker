package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// AudioGenerationWorkflowInput is the input for the audio generation workflow
type AudioGenerationWorkflowInput struct {
	DialogueID string
	Text       string
	VoiceID    string
	OrgID      string
}

// AudioGenerationWorkflowResult is the result of the audio generation workflow
type AudioGenerationWorkflowResult struct {
	AudioID    string
	AudioData  []byte
	AudioURL   string
	Duration   float64
	DialogueID string
}

// AudioGenerationWorkflow handles dialogue audio generation using Hume
func AudioGenerationWorkflow(ctx workflow.Context, input AudioGenerationWorkflowInput) (*AudioGenerationWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("AudioGenerationWorkflow started", "dialogueID", input.DialogueID, "voiceID", input.VoiceID)

	// Set activity options
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: 5 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	// Generate audio
	var result AudioGenerationWorkflowResult
	err := workflow.ExecuteActivity(ctx, "GenerateDialogueAudioActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to generate audio", "error", err)
		return nil, err
	}

	// Save to database
	err = workflow.ExecuteActivity(ctx, "SaveDialogueAudioActivity", result, input.DialogueID).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to save generated audio", "error", err)
		return nil, err
	}

	logger.Info("AudioGenerationWorkflow completed", "dialogueID", input.DialogueID)
	return &result, nil
}
