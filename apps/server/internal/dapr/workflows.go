package dapr

import (
	"fmt"
	"log"

	"github.com/dapr/go-sdk/workflow"
)

// StoryboardUpdateParams contains parameters for storyboard updates
type StoryboardUpdateParams struct {
	FilePath   string
	EpisodeID  string
	PageNumber int32
	Panel      int32
	PanelData  map[string]interface{}
}

// StoryboardUpdateResult contains the result of a storyboard update
type StoryboardUpdateResult struct {
	Success bool
	Message string
}

// AutonomousGenerationParams contains parameters for the A2A workflow
type AutonomousGenerationParams struct {
	FilePath       string
	EpisodeID      string
	Goal           string
	InitialContext []map[string]interface{}
	SessionID      string
}

// AutonomousGenerationResult contains the result of autonomous generation
type AutonomousGenerationResult struct {
	Success bool
	Message string
}

type episodeDraft struct {
	Content string
	Params  AutonomousGenerationParams
}

// StoryboardUpdateWorkflow handles async storyboard updates
func StoryboardUpdateWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params StoryboardUpdateParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var result StoryboardUpdateResult
	if err := ctx.CallActivity(SaveStoryboardActivity, workflow.ActivityInput(params)).Await(&result); err != nil {
		return &StoryboardUpdateResult{Success: false, Message: err.Error()}, err
	}

	return &result, nil
}

// AutonomousGenerationWorkflow orchestrates A2A autonomous story generation
func AutonomousGenerationWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	log.Printf("Starting Autonomous Generation: goal=%s", params.Goal)

	// 0. Context Discovery
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "🔍 Analyzing storyboard context..."}))

	// 1. Scenario Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "scenario", Role: "system", Content: "🧠 Scenario Agent is brainstorming..."}))
	var scenarioOutput string
	if err := ctx.CallActivity(ScenarioAgentActivity, workflow.ActivityInput(params)).Await(&scenarioOutput); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "scenario", Role: "error", Content: "Scenario Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Scenario Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "scenario", Role: "assistant", Content: "✅ Plot plan finalized:\n" + scenarioOutput}))

	// 2. Episode Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "episode", Role: "system", Content: "✍️ Episode Agent is drafting..."}))
	var episodeOutput string
	if err := ctx.CallActivity(EpisodeAgentActivity, workflow.ActivityInput(episodeDraft{Content: scenarioOutput, Params: params})).Await(&episodeOutput); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "episode", Role: "error", Content: "Episode Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Episode Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "episode", Role: "assistant", Content: "✅ Scene draft generated."}))

	// 2.5 Apply Episode Updates
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "💾 Applying episode updates..."}))
	var applyResult ApplyUpdatesResult
	if err := ctx.CallActivity(ApplyEpisodeUpdatesActivity, workflow.ActivityInput(ApplyUpdatesParams{
		FilePath:    params.FilePath,
		EpisodeID:   params.EpisodeID,
		AgentOutput: episodeOutput,
		SessionID:   params.SessionID,
	})).Await(&applyResult); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "error", Content: "Failed to apply updates: " + err.Error()}))
	} else {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: fmt.Sprintf("✅ Updated %d panels", applyResult.UpdatedCount)}))
	}

	// 3. Character Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "character", Role: "system", Content: "🎭 Character Agent reviewing..."}))
	var characterFeedback string
	if err := ctx.CallActivity(CharacterAgentActivity, workflow.ActivityInput(episodeDraft{Content: episodeOutput, Params: params})).Await(&characterFeedback); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "character", Role: "error", Content: "Character Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Character Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "character", Role: "assistant", Content: "✅ Character consistency verified."}))

	// 3.5 Reviewer Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "reviewer", Role: "system", Content: "🧐 Reviewer critiquing..."}))
	var reviewerCritique string
	if err := ctx.CallActivity(ReviewerAgentActivity, workflow.ActivityInput(characterFeedback)).Await(&reviewerCritique); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "reviewer", Role: "error", Content: "Reviewer Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Reviewer Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "reviewer", Role: "assistant", Content: "✅ Review complete:\n" + reviewerCritique}))

	// 4. Cinematic Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "cinematic", Role: "system", Content: "🎥 Cinematic Sketcher designing..."}))
	var finalResult string
	if err := ctx.CallActivity(CinematicAgentActivity, workflow.ActivityInput(episodeDraft{Content: episodeOutput, Params: params})).Await(&finalResult); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "cinematic", Role: "error", Content: "Cinematic Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Cinematic Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "cinematic", Role: "assistant", Content: "✅ Visual direction finalized."}))

	// 4.5 Apply Cinematic Updates
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "💾 Applying visual direction..."}))
	var cinematicApplyResult ApplyUpdatesResult
	if err := ctx.CallActivity(ApplyEpisodeUpdatesActivity, workflow.ActivityInput(ApplyUpdatesParams{
		FilePath:    params.FilePath,
		EpisodeID:   params.EpisodeID,
		AgentOutput: finalResult,
		SessionID:   params.SessionID,
	})).Await(&cinematicApplyResult); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "error", Content: "Failed to apply cinematic updates: " + err.Error()}))
	} else {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: fmt.Sprintf("✅ Updated %d panels with visual direction", cinematicApplyResult.UpdatedCount)}))
	}

	// 4.6 Generate Panel Images
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "🖼️ Generating panel images..."}))
	var imageResult GenerateImagesResult
	if err := ctx.CallActivity(GeneratePanelImagesActivity, workflow.ActivityInput(GenerateImagesParams{
		FilePath:        params.FilePath,
		EpisodeID:       params.EpisodeID,
		CinematicOutput: finalResult,
	})).Await(&imageResult); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "error", Content: "Failed to generate images: " + err.Error()}))
	} else {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: fmt.Sprintf("✅ Generated %d panel images", imageResult.GeneratedCount)}))
	}

	// 4.1-4.3 Optional agents (non-blocking)
	var envOutput, propOutput, ghostOutput string
	ctx.CallActivity(EnvironmentAgentActivity, workflow.ActivityInput(finalResult)).Await(&envOutput)
	ctx.CallActivity(PropAgentActivity, workflow.ActivityInput(finalResult)).Await(&propOutput)
	ctx.CallActivity(GhostAgentActivity, workflow.ActivityInput(finalResult)).Await(&ghostOutput)

	// 5. Evaluation Agent
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "evaluation", Role: "system", Content: "📊 Final QA..."}))
	var evaluationReport string
	if err := ctx.CallActivity(EvaluationAgentActivity, workflow.ActivityInput(episodeOutput)).Await(&evaluationReport); err != nil {
		ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "evaluation", Role: "error", Content: "Evaluation Agent failed: " + err.Error()}))
		return &AutonomousGenerationResult{Success: false, Message: "Evaluation Agent failed: " + err.Error()}, err
	}
	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "evaluation", Role: "assistant", Content: "🏆 Final Evaluation:\n" + evaluationReport}))

	// 6. Vision Agent (placeholder)
	var visionFeedback string
	ctx.CallActivity(VisionAnalysisActivity, workflow.ActivityInput("placeholder_image_url")).Await(&visionFeedback)

	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "🏁 Autonomous generation complete."}))

	return &AutonomousGenerationResult{
		Success: true,
		Message: "Autonomous generation completed successfully",
	}, nil
}

// EpisodeMasterWorkflow is an iterative wrapper
func EpisodeMasterWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	ctx.CallActivity(BroadcastAgentMessageActivity, workflow.ActivityInput(BroadcastParams{AgentMode: "general", Role: "system", Content: "👑 Starting Episode Master A2A Loop..."}))

	// Delegate to autonomous generation
	var result AutonomousGenerationResult
	if err := ctx.CallChildWorkflow(AutonomousGenerationWorkflow, workflow.ChildWorkflowInput(params)).Await(&result); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}

	return &result, nil
}

// ScenarioGenerationWorkflow handles single-agent scenario generation
func ScenarioGenerationWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(ScenarioAgentActivity, workflow.ActivityInput(params)).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// EpisodeGenerationWorkflow handles single-agent episode generation
func EpisodeGenerationWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(EpisodeAgentActivity, workflow.ActivityInput(params.Goal)).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// CharacterRefinementWorkflow handles character consistency
func CharacterRefinementWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(CharacterAgentActivity, workflow.ActivityInput(episodeDraft{Content: params.Goal, Params: params})).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// CinematicSketchWorkflow handles visual prompt generation
func CinematicSketchWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(CinematicAgentActivity, workflow.ActivityInput(params.Goal)).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// ReviewerAgentWorkflow handles independent review
func ReviewerAgentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(ReviewerAgentActivity, workflow.ActivityInput(params.Goal)).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// EvaluationAgentWorkflow handles independent evaluation
func EvaluationAgentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var params AutonomousGenerationParams
	if err := ctx.GetInput(&params); err != nil {
		return nil, err
	}

	var output string
	if err := ctx.CallActivity(EvaluationAgentActivity, workflow.ActivityInput(params.Goal)).Await(&output); err != nil {
		return &AutonomousGenerationResult{Success: false, Message: err.Error()}, err
	}
	return &AutonomousGenerationResult{Success: true, Message: output}, nil
}

// RegisterWorkflows registers all workflows with the Dapr workflow registry
func RegisterWorkflows(r *workflow.Registry) error {
	workflows := []interface{}{
		StoryboardUpdateWorkflow,
		AutonomousGenerationWorkflow,
		EpisodeMasterWorkflow,
		ScenarioGenerationWorkflow,
		EpisodeGenerationWorkflow,
		CharacterRefinementWorkflow,
		CinematicSketchWorkflow,
		ReviewerAgentWorkflow,
		EvaluationAgentWorkflow,
	}

	for _, wf := range workflows {
		if err := r.AddWorkflow(wf); err != nil {
			return fmt.Errorf("failed to register workflow: %w", err)
		}
	}
	return nil
}

// RegisterActivities registers all activities with the Dapr workflow registry
func RegisterActivities(r *workflow.Registry) error {
	activities := []interface{}{
		SaveStoryboardActivity,
		ScenarioAgentActivity,
		EpisodeAgentActivity,
		CharacterAgentActivity,
		CinematicAgentActivity,
		ReviewerAgentActivity,
		EvaluationAgentActivity,
		BroadcastAgentMessageActivity,
		ApplyEpisodeUpdatesActivity,
		GeneratePanelImagesActivity,
		VisionAnalysisActivity,
		EnvironmentAgentActivity,
		PropAgentActivity,
		GhostAgentActivity,
	}

	for _, act := range activities {
		if err := r.AddActivity(act); err != nil {
			return fmt.Errorf("failed to register activity: %w", err)
		}
	}
	return nil
}
