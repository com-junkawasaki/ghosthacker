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
		StartToCloseTimeout: 10 * 60 * 1e9, // 10 minutes
	}

	ctx = workflow.WithActivityOptions(ctx, options)

	var result StoryboardUpdateResult
	err := workflow.ExecuteActivity(ctx, SaveStoryboardActivity, params).Get(ctx, &result)
	if err != nil {
		return StoryboardUpdateResult{Success: false, Message: err.Error()}, err
	}

	return result, nil
}

type AutonomousGenerationParams struct {
	FilePath       string
	EpisodeID      string
	Goal           string
	InitialContext []map[string]interface{}
	SessionID      string
}

type AutonomousGenerationResult struct {
	Success bool
	Message string
}

// AutonomousGenerationWorkflow orchestrates A2A autonomous story generation
func AutonomousGenerationWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 15 * 60 * 1e9, // 15 minutes
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	logger := workflow.GetLogger(ctx)
	logger.Info("Starting Autonomous Generation", "goal", params.Goal)

	// 1. Scenario Agent: Plan the next steps
	var scenarioOutput string
	err := workflow.ExecuteActivity(ctx, ScenarioAgentActivity, params).Get(ctx, &scenarioOutput)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: "Scenario Agent failed: " + err.Error()}, err
	}

	// 2. Episode Agent: Generate detailed content
	var episodeOutput string
	err = workflow.ExecuteActivity(ctx, EpisodeAgentActivity, scenarioOutput).Get(ctx, &episodeOutput)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: "Episode Agent failed: " + err.Error()}, err
	}

	// 3. Character Agent: Verify and Refine
	var characterFeedback string
	err = workflow.ExecuteActivity(ctx, CharacterAgentActivity, episodeDraft{Content: episodeOutput, Params: params}).Get(ctx, &characterFeedback)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: "Character Agent failed: " + err.Error()}, err
	}

	// 4. Cinematic Agent: Finalize visual direction
	var finalResult string
	err = workflow.ExecuteActivity(ctx, CinematicAgentActivity, episodeOutput).Get(ctx, &finalResult)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: "Cinematic Agent failed: " + err.Error()}, err
	}

	return AutonomousGenerationResult{
		Success: true,
		Message: "Autonomous generation completed successfully",
	}, nil
}

type episodeDraft struct {
	Content string
	Params  AutonomousGenerationParams
}

// ScenarioGenerationWorkflow handles high-level plot generation
func ScenarioGenerationWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, ScenarioAgentActivity, params).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}

// EpisodeGenerationWorkflow handles detailed episode generation
func EpisodeGenerationWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, EpisodeAgentActivity, params.Goal).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}

// CharacterRefinementWorkflow handles character consistency refinement
func CharacterRefinementWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, CharacterAgentActivity, episodeDraft{Content: params.Goal, Params: params}).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}

// CinematicSketchWorkflow handles visual prompt generation
func CinematicSketchWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, CinematicAgentActivity, params.Goal).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}
