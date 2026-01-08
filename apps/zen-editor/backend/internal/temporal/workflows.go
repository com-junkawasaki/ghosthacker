package temporal

import (
	"time"

	"go.temporal.io/sdk/workflow"
)

type StoryProcessingResult struct {
	GraphJSON string
	Emotions  map[string]float64
}

func StoryProcessingWorkflow(ctx workflow.Context, text string, filePath string) (StoryProcessingResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 1 * time.Minute,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var activities *Activities
	var graphJSON string
	var emotions map[string]float64
	var result StoryProcessingResult

	// Parallel execution of AI tasks
	graphFuture := workflow.ExecuteActivity(ctx, activities.ExtractEntitiesActivity, text)
	emotionFuture := workflow.ExecuteActivity(ctx, activities.AnalyzeEmotionsActivity, text)

	err := graphFuture.Get(ctx, &graphJSON)
	if err != nil {
		return result, err
	}

	err = emotionFuture.Get(ctx, &emotions)
	if err != nil {
		return result, err
	}

	// Serial Git commit
	err = workflow.ExecuteActivity(ctx, activities.GitCommitActivity, filePath, "Auto-update from editor").Get(ctx, nil)
	if err != nil {
		// We might log this but not fail the whole analysis
	}

	result.GraphJSON = graphJSON
	result.Emotions = emotions

	return result, nil
}

