package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// ApprovalWorkflowInput is the input for the approval workflow
type ApprovalWorkflowInput struct {
	ApprovalID   string
	ProjectID    string
	EpisodeID    string
	Type         string // script, storyboard, key_animation, audio_mix, final_cut
	SubmitterID  string
	ResourceID   string
	ResourceType string
}

// ApprovalWorkflowResult is the result of the approval workflow
type ApprovalWorkflowResult struct {
	Status     string
	ApprovedBy string
	Comment    string
}

// ApprovalSignal represents a signal to the approval workflow
type ApprovalSignal struct {
	Action     string // approve, reject, request_changes
	ReviewerID string
	Comment    string
}

// ApprovalWorkflow handles the approval process for production assets
func ApprovalWorkflow(ctx workflow.Context, input ApprovalWorkflowInput) (*ApprovalWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("ApprovalWorkflow started", "approvalID", input.ApprovalID, "type", input.Type)

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

	// Get reviewers for this approval type
	var reviewers []string
	err := workflow.ExecuteActivity(ctx, "GetReviewersByType", input.ProjectID, input.Type).Get(ctx, &reviewers)
	if err != nil {
		logger.Error("Failed to get reviewers", "error", err)
		return nil, err
	}

	// Notify reviewers
	for _, reviewerID := range reviewers {
		err := workflow.ExecuteActivity(ctx, "NotifyUser", reviewerID, "approval_request", map[string]string{
			"approval_id":   input.ApprovalID,
			"type":          input.Type,
			"resource_type": input.ResourceType,
		}).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to notify reviewer", "reviewerID", reviewerID, "error", err)
		}
	}

	// Update status to under_review
	err = workflow.ExecuteActivity(ctx, "UpdateApprovalStatus", input.ApprovalID, "under_review").Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update status", "error", err)
		return nil, err
	}

	// Wait for approval signal
	signalChan := workflow.GetSignalChannel(ctx, "approval_action")
	var signal ApprovalSignal

	// Wait for signal or timeout after 7 days
	selector := workflow.NewSelector(ctx)
	var signalReceived bool

	selector.AddReceive(signalChan, func(c workflow.ReceiveChannel, more bool) {
		c.Receive(ctx, &signal)
		signalReceived = true
	})

	selector.AddFuture(workflow.NewTimer(ctx, 7*24*time.Hour), func(f workflow.Future) {
		// Timeout - escalate
		logger.Warn("Approval timeout, escalating", "approvalID", input.ApprovalID)
	})

	selector.Select(ctx)

	if !signalReceived {
		// Handle timeout - notify submitter and managers
		err := workflow.ExecuteActivity(ctx, "NotifyUser", input.SubmitterID, "approval_timeout", map[string]string{
			"approval_id": input.ApprovalID,
			"type":        input.Type,
		}).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to notify submitter of timeout", "error", err)
		}

		return &ApprovalWorkflowResult{
			Status:  "timeout",
			Comment: "Approval request timed out after 7 days",
		}, nil
	}

	// Process the signal
	var newStatus string
	switch signal.Action {
	case "approve":
		newStatus = "approved"
	case "reject":
		newStatus = "rejected"
	case "request_changes":
		newStatus = "request_changes"
	default:
		newStatus = "under_review"
	}

	// Update approval status
	err = workflow.ExecuteActivity(ctx, "UpdateApprovalStatus", input.ApprovalID, newStatus).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update approval status", "error", err)
		return nil, err
	}

	// Notify submitter of the result
	err = workflow.ExecuteActivity(ctx, "NotifyUser", input.SubmitterID, "approval_result", map[string]string{
		"approval_id": input.ApprovalID,
		"status":      newStatus,
		"reviewer_id": signal.ReviewerID,
		"comment":     signal.Comment,
	}).Get(ctx, nil)
	if err != nil {
		logger.Warn("Failed to notify submitter", "error", err)
	}

	logger.Info("ApprovalWorkflow completed", "approvalID", input.ApprovalID, "status", newStatus)

	return &ApprovalWorkflowResult{
		Status:     newStatus,
		ApprovedBy: signal.ReviewerID,
		Comment:    signal.Comment,
	}, nil
}
