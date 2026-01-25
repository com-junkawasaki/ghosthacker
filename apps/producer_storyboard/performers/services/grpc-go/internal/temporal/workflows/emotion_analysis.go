package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// EmotionAnalysisWorkflowInput is the input for emotion analysis workflow
type EmotionAnalysisWorkflowInput struct {
	Text     string
	NodeID   string
	NodeType string
	OrgID    string
}

// EmotionAnalysisWorkflowResult is the result of emotion analysis workflow
type EmotionAnalysisWorkflowResult struct {
	NodeID          string
	Emotions        map[string]float64
	DominantEmotion string
	Confidence      float64
}

// EmotionAnalysisWorkflow handles emotion analysis using Hume AI
func EmotionAnalysisWorkflow(ctx workflow.Context, input EmotionAnalysisWorkflowInput) (*EmotionAnalysisWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("EmotionAnalysisWorkflow started", "nodeID", input.NodeID, "nodeType", input.NodeType)

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

	// Analyze emotions
	var result EmotionAnalysisWorkflowResult
	err := workflow.ExecuteActivity(ctx, "AnalyzeEmotionsActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to analyze emotions", "error", err)
		return nil, err
	}

	// Save to database
	err = workflow.ExecuteActivity(ctx, "SaveEmotionAnalysisActivity", result, input.NodeID, input.NodeType).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to save emotion analysis", "error", err)
		return nil, err
	}

	logger.Info("EmotionAnalysisWorkflow completed", "nodeID", input.NodeID)
	return &result, nil
}
