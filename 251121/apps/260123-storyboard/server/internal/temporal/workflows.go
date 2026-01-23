package temporal

import (
	"go.temporal.io/sdk/workflow"
)

type StoryboardUpdateParams struct {
	FilePath  string
	EpisodeID string
	PageNumber int32
	Panel     int32
	PanelData map[string]interface{}
}

type StoryboardUpdateResult struct {
	Success bool
	Message string
}

// StoryboardUpdateWorkflow handles async storyboard updates
func StoryboardUpdateWorkflow(ctx workflow.Context, params StoryboardUpdateParams) (StoryboardUpdateResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: workflow.DefaultActivityOptions.StartToCloseTimeout,
	}

	ctx = workflow.WithActivityOptions(ctx, options)

	var result StoryboardUpdateResult
	err := workflow.ExecuteActivity(ctx, SaveStoryboardActivity, params).Get(ctx, &result)
	if err != nil {
		return StoryboardUpdateResult{Success: false, Message: err.Error()}, err
	}

	return result, nil
}
