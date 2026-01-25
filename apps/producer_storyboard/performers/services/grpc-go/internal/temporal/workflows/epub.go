package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// EpubExportWorkflowInput is the input for EPUB export workflow
type EpubExportWorkflowInput struct {
	NovelProjectID string
	ChapterIDs     []string
	OrgID          string
}

// EpubExportWorkflowResult is the result of EPUB export workflow
type EpubExportWorkflowResult struct {
	EpubData []byte
	Filename string
	Size     int64
}

// EpubExportWorkflow handles EPUB export
func EpubExportWorkflow(ctx workflow.Context, input EpubExportWorkflowInput) (*EpubExportWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("EpubExportWorkflow started", "novelProjectID", input.NovelProjectID)

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

	// Export EPUB
	var result EpubExportWorkflowResult
	err := workflow.ExecuteActivity(ctx, "ExportEpubActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to export EPUB", "error", err)
		return nil, err
	}

	logger.Info("EpubExportWorkflow completed", "filename", result.Filename)
	return &result, nil
}

// EpubImportWorkflowInput is the input for EPUB import workflow
type EpubImportWorkflowInput struct {
	NovelProjectID string
	EpubData       []byte
	OrgID          string
}

// EpubImportWorkflowResult is the result of EPUB import workflow
type EpubImportWorkflowResult struct {
	ChaptersCreated []string
	Metadata        map[string]interface{}
}

// EpubImportWorkflow handles EPUB import
func EpubImportWorkflow(ctx workflow.Context, input EpubImportWorkflowInput) (*EpubImportWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("EpubImportWorkflow started", "novelProjectID", input.NovelProjectID)

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

	// Import EPUB
	var result EpubImportWorkflowResult
	err := workflow.ExecuteActivity(ctx, "ImportEpubActivity", input).Get(ctx, &result)
	if err != nil {
		logger.Error("Failed to import EPUB", "error", err)
		return nil, err
	}

	logger.Info("EpubImportWorkflow completed", "chaptersCreated", len(result.ChaptersCreated))
	return &result, nil
}
