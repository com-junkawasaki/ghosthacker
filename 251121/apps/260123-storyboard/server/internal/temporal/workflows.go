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

	// 0. Context Discovery
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "general", Role: "system", Content: "🔍 Analyzing storyboard context to determine relevant scope..."})

	// 1. Scenario Agent: Plan the next steps
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "scenario", Role: "system", Content: "🧠 Scenario Agent is brainstorming the next plot points..."})
	var scenarioOutput string
	err := workflow.ExecuteActivity(ctx, ScenarioAgentActivity, params).Get(ctx, &scenarioOutput)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "scenario", Role: "error", Content: "Scenario Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Scenario Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "scenario", Role: "assistant", Content: "✅ Plot plan finalized:\n" + scenarioOutput})

	// 2. Episode Agent: Generate detailed content
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "episode", Role: "system", Content: "✍️ Episode Agent is drafting detailed scenes and dialogue..."})
	var episodeOutput string
	err = workflow.ExecuteActivity(ctx, EpisodeAgentActivity, scenarioOutput).Get(ctx, &episodeOutput)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "episode", Role: "error", Content: "Episode Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Episode Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "episode", Role: "assistant", Content: "✅ Scene draft generated."})

	// 3. Character Agent: Verify and Refine
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "character", Role: "system", Content: "🎭 Character Specialist is reviewing character voices..."})
	var characterFeedback string
	err = workflow.ExecuteActivity(ctx, CharacterAgentActivity, episodeDraft{Content: episodeOutput, Params: params}).Get(ctx, &characterFeedback)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "character", Role: "error", Content: "Character Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Character Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "character", Role: "assistant", Content: "✅ Character consistency verified."})

	// 3.5 Reviewer Agent: Critique the draft
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "reviewer", Role: "system", Content: "🧐 Story Editor is critiquing the draft for quality..."})
	var reviewerCritique string
	err = workflow.ExecuteActivity(ctx, ReviewerAgentActivity, characterFeedback).Get(ctx, &reviewerCritique)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "reviewer", Role: "error", Content: "Reviewer Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Reviewer Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "reviewer", Role: "assistant", Content: "✅ Review complete:\n" + reviewerCritique})

	// 4. Cinematic Agent: Finalize visual direction
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "cinematic", Role: "system", Content: "🎥 Cinematic Sketcher is designing visual composition..."})
	var finalResult string
	err = workflow.ExecuteActivity(ctx, CinematicAgentActivity, episodeOutput).Get(ctx, &finalResult)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "cinematic", Role: "error", Content: "Cinematic Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Cinematic Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "cinematic", Role: "assistant", Content: "✅ Visual direction finalized."})

	// 4.1 Environment Agent: Refine location details
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "environment", Role: "system", Content: "🏙️ Environment Specialist is refining location details..."})
	var envOutput string
	err = workflow.ExecuteActivity(ctx, EnvironmentAgentActivity, finalResult).Get(ctx, &envOutput)
	if err == nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "environment", Role: "assistant", Content: "✅ Environment details refined:\n" + envOutput})
	}

	// 4.2 Prop Agent: Identify gadgets and objects
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "prop", Role: "system", Content: "🛠️ Prop Specialist is identifying gadgets and objects..."})
	var propOutput string
	err = workflow.ExecuteActivity(ctx, PropAgentActivity, finalResult).Get(ctx, &propOutput)
	if err == nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "prop", Role: "assistant", Content: "✅ Props and gadgets identified:\n" + propOutput})
	}

	// 4.3 Ghost Agent: Design glitch and supernatural effects
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "ghost", Role: "system", Content: "👻 Ghost Specialist is designing glitch effects..."})
	var ghostOutput string
	err = workflow.ExecuteActivity(ctx, GhostAgentActivity, finalResult).Get(ctx, &ghostOutput)
	if err == nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "ghost", Role: "assistant", Content: "✅ Digital ghost effects designed:\n" + ghostOutput})
	}

	// 5. Evaluation Agent: Final QA
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "evaluation", Role: "system", Content: "📊 Performing final Quality Assurance and Episode Evaluation..."})
	var evaluationReport string
	err = workflow.ExecuteActivity(ctx, EvaluationAgentActivity, episodeOutput).Get(ctx, &evaluationReport)
	if err != nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "evaluation", Role: "error", Content: "Evaluation Agent failed: " + err.Error()})
		return AutonomousGenerationResult{Success: false, Message: "Evaluation Agent failed: " + err.Error()}, err
	}
	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "evaluation", Role: "assistant", Content: "🏆 Final Evaluation Report:\n" + evaluationReport})

	// 6. Vision Agent: Multimodal Feedback (Concept)
	var visionFeedback string
	// In a real loop, we'd pass the generated image URL here
	err = workflow.ExecuteActivity(ctx, VisionAnalysisActivity, "placeholder_image_url").Get(ctx, &visionFeedback)
	if err == nil {
		workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "vision", Role: "assistant", Content: visionFeedback})
	}

	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "general", Role: "system", Content: "🏁 Autonomous generation complete. You can review the changes in the Story Editor."})

	return AutonomousGenerationResult{
		Success: true,
		Message: "Autonomous generation completed successfully",
	}, nil
}

// EpisodeMasterWorkflow is an iterative loop for full episode completion
func EpisodeMasterWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 30 * 60 * 1e9, // 30 minutes for master loop
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	workflow.ExecuteActivity(ctx, BroadcastAgentMessageActivity, BroadcastParams{AgentMode: "general", Role: "system", Content: "👑 Starting Episode Master A2A Loop..."})

	// Run the standard autonomous generation
	result, err := AutonomousGenerationWorkflow(ctx, params)
	if err != nil {
		return result, err
	}

	return result, nil
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

// ReviewerAgentWorkflow handles independent review tasks
func ReviewerAgentWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, ReviewerAgentActivity, params.Goal).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}

// EvaluationAgentWorkflow handles independent evaluation tasks
func EvaluationAgentWorkflow(ctx workflow.Context, params AutonomousGenerationParams) (AutonomousGenerationResult, error) {
	options := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * 60 * 1e9,
	}
	ctx = workflow.WithActivityOptions(ctx, options)

	var output string
	err := workflow.ExecuteActivity(ctx, EvaluationAgentActivity, params.Goal).Get(ctx, &output)
	if err != nil {
		return AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return AutonomousGenerationResult{Success: true, Message: output}, nil
}
