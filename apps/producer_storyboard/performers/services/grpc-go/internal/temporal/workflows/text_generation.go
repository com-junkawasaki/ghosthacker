package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// TextGenerationWorkflowInput is the input for text generation workflow
type TextGenerationWorkflowInput struct {
	Prompt    string
	Model     string
	MaxTokens int32
	OrgID     string
	Context   map[string]interface{} // Additional context for generation
}

// TextGenerationWorkflowResult is the result of text generation workflow
type TextGenerationWorkflowResult struct {
	GeneratedText string
	Model         string
	TokensUsed    int32
}

// TextGenerationWorkflow handles text generation using OpenAI
func TextGenerationWorkflow(ctx workflow.Context, input TextGenerationWorkflowInput) (*TextGenerationWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("TextGenerationWorkflow started", "model", input.Model)

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

	// Generate text
	var result TextGenerationWorkflowResult
	err := workflow.ExecuteActivity(ctx, "GenerateTextActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to generate text", "error", err)
		return nil, err
	}

	logger.Info("TextGenerationWorkflow completed")
	return &result, nil
}
