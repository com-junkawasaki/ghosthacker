package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// ProductionPhase represents a phase in the production workflow
type ProductionPhase struct {
	Status       string
	Order        int
	RequiredRole string // Role required to complete this phase
}

// ProductionPhases defines the order of production phases
var ProductionPhases = []ProductionPhase{
	{Status: "planning", Order: 1, RequiredRole: "production_manager"},
	{Status: "script", Order: 2, RequiredRole: "screenwriter"},
	{Status: "storyboard", Order: 3, RequiredRole: "storyboard_artist"},
	{Status: "layout", Order: 4, RequiredRole: "animation_director"},
	{Status: "key_animation", Order: 5, RequiredRole: "key_animator"},
	{Status: "in_between", Order: 6, RequiredRole: "in_between_animator"},
	{Status: "coloring", Order: 7, RequiredRole: "color_designer"},
	{Status: "compositing", Order: 8, RequiredRole: "director_of_photography"},
	{Status: "audio_recording", Order: 9, RequiredRole: "sound_director"},
	{Status: "audio_mix", Order: 10, RequiredRole: "sound_director"},
	{Status: "editing", Order: 11, RequiredRole: "editor"},
	{Status: "final_check", Order: 12, RequiredRole: "director"},
	{Status: "delivered", Order: 13, RequiredRole: "producer"},
}

// ProductionWorkflowInput is the input for the production workflow
type ProductionWorkflowInput struct {
	ProjectID string
	EpisodeID string
	Deadline  string
}

// ProductionWorkflowResult is the result of the production workflow
type ProductionWorkflowResult struct {
	FinalStatus     string
	CompletedPhases []string
}

// ProductionSignal represents a signal to advance the production
type ProductionSignal struct {
	Action          string // advance, approve, block, unblock
	NextStatus      string
	CompletedBy     string
	ProgressPercent float64
}

// ProductionWorkflow manages the entire production lifecycle of an episode
func ProductionWorkflow(ctx workflow.Context, input ProductionWorkflowInput) (*ProductionWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("ProductionWorkflow started", "projectID", input.ProjectID, "episodeID", input.EpisodeID)

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

	completedPhases := []string{}
	currentPhaseIndex := 0
	currentStatus := "planning"

	// Update initial status
	err := workflow.ExecuteActivity(ctx, "UpdateProductionStatus",
		input.ProjectID, input.EpisodeID, currentStatus, 0.0).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update initial status", "error", err)
		return nil, err
	}

	// Process each phase
	signalChan := workflow.GetSignalChannel(ctx, "production_action")

	for currentPhaseIndex < len(ProductionPhases) {
		phase := ProductionPhases[currentPhaseIndex]
		logger.Info("Starting phase", "phase", phase.Status, "order", phase.Order)

		// Notify the team responsible for this phase
		err := workflow.ExecuteActivity(ctx, "NotifyRole",
			input.ProjectID, phase.RequiredRole, "phase_started", map[string]string{
				"episode_id": input.EpisodeID,
				"phase":      phase.Status,
			}).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to notify team", "role", phase.RequiredRole, "error", err)
		}

		// Wait for signal to advance or timeout
		var signal ProductionSignal
		var signalReceived bool

		selector := workflow.NewSelector(ctx)

		selector.AddReceive(signalChan, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, &signal)
			signalReceived = true
		})

		// Timeout based on phase (longer for complex phases)
		phaseTimeout := 7 * 24 * time.Hour // Default 7 days
		if phase.Status == "key_animation" || phase.Status == "in_between" {
			phaseTimeout = 14 * 24 * time.Hour // 14 days for animation phases
		}

		selector.AddFuture(workflow.NewTimer(ctx, phaseTimeout), func(f workflow.Future) {
			logger.Warn("Phase timeout", "phase", phase.Status)
		})

		selector.Select(ctx)

		if !signalReceived {
			// Escalate timeout
			err := workflow.ExecuteActivity(ctx, "NotifyRole",
				input.ProjectID, "production_manager", "phase_timeout", map[string]string{
					"episode_id": input.EpisodeID,
					"phase":      phase.Status,
				}).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to notify production manager", "error", err)
			}
			// Wait for signal again (don't advance automatically)
			signalChan.Receive(ctx, &signal)
		}

		// Process the signal
		switch signal.Action {
		case "advance", "approve":
			completedPhases = append(completedPhases, phase.Status)
			currentPhaseIndex++

			if currentPhaseIndex < len(ProductionPhases) {
				currentStatus = ProductionPhases[currentPhaseIndex].Status
			} else {
				currentStatus = "delivered"
			}

			// Calculate progress
			progress := float64(currentPhaseIndex) / float64(len(ProductionPhases)) * 100
			if signal.ProgressPercent > 0 {
				progress = signal.ProgressPercent
			}

			// Update status
			err := workflow.ExecuteActivity(ctx, "UpdateProductionStatus",
				input.ProjectID, input.EpisodeID, currentStatus, progress).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

		case "block":
			// Keep waiting but notify
			logger.Warn("Phase blocked", "phase", phase.Status)
			err := workflow.ExecuteActivity(ctx, "NotifyRole",
				input.ProjectID, "production_manager", "phase_blocked", map[string]string{
					"episode_id": input.EpisodeID,
					"phase":      phase.Status,
				}).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to notify about block", "error", err)
			}
			// Wait for unblock signal
			signalChan.Receive(ctx, &signal)
		}
	}

	// Update final status
	err = workflow.ExecuteActivity(ctx, "UpdateProductionStatus",
		input.ProjectID, input.EpisodeID, "delivered", 100.0).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update final status", "error", err)
	}

	// Notify completion
	err = workflow.ExecuteActivity(ctx, "NotifyRole",
		input.ProjectID, "producer", "episode_delivered", map[string]string{
			"episode_id": input.EpisodeID,
		}).Get(ctx, nil)
	if err != nil {
		logger.Warn("Failed to notify completion", "error", err)
	}

	logger.Info("ProductionWorkflow completed", "episodeID", input.EpisodeID)

	return &ProductionWorkflowResult{
		FinalStatus:     "delivered",
		CompletedPhases: completedPhases,
	}, nil
}
