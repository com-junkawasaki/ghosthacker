package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// TaskWorkflowInput is the input for the task workflow
type TaskWorkflowInput struct {
	TaskID      string
	ProjectID   string
	EpisodeID   string
	Title       string
	Description string
	RoleID      string
	Deadline    string
}

// TaskWorkflowResult is the result of the task workflow
type TaskWorkflowResult struct {
	Status      string
	CompletedBy string
	CompletedAt string
}

// TaskSignal represents a signal to the task workflow
type TaskSignal struct {
	Action  string // assign, start, submit, approve, reject, block, unblock, cancel
	UserID  string
	Comment string
}

// TaskWorkflow manages individual task assignments and progress
func TaskWorkflow(ctx workflow.Context, input TaskWorkflowInput) (*TaskWorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("TaskWorkflow started", "taskID", input.TaskID, "title", input.Title)

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

	currentStatus := "created"
	var assigneeID string
	signalChan := workflow.GetSignalChannel(ctx, "task_action")

	// Update initial status
	err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
	if err != nil {
		logger.Error("Failed to update initial status", "error", err)
		return nil, err
	}

	// Main task loop
	for {
		var signal TaskSignal

		// Wait for signal
		signalChan.Receive(ctx, &signal)
		logger.Info("Received signal", "action", signal.Action, "userID", signal.UserID)

		switch signal.Action {
		case "assign":
			assigneeID = signal.UserID
			currentStatus = "assigned"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify assignee
			err = workflow.ExecuteActivity(ctx, "NotifyUser", assigneeID, "task_assigned", map[string]string{
				"task_id":    input.TaskID,
				"title":      input.Title,
				"project_id": input.ProjectID,
			}).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to notify assignee", "error", err)
			}

		case "start":
			if assigneeID == "" {
				logger.Warn("Cannot start task without assignee")
				continue
			}
			currentStatus = "in_progress"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

		case "submit":
			currentStatus = "review"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify role lead for review
			err = workflow.ExecuteActivity(ctx, "NotifyRole",
				input.ProjectID, input.RoleID, "task_review_requested", map[string]string{
					"task_id":      input.TaskID,
					"title":        input.Title,
					"submitted_by": assigneeID,
				}).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to notify for review", "error", err)
			}

		case "approve":
			currentStatus = "completed"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify assignee of completion
			if assigneeID != "" {
				err = workflow.ExecuteActivity(ctx, "NotifyUser", assigneeID, "task_approved", map[string]string{
					"task_id":     input.TaskID,
					"title":       input.Title,
					"approved_by": signal.UserID,
				}).Get(ctx, nil)
				if err != nil {
					logger.Warn("Failed to notify assignee", "error", err)
				}
			}

			logger.Info("TaskWorkflow completed", "taskID", input.TaskID, "status", currentStatus)
			return &TaskWorkflowResult{
				Status:      currentStatus,
				CompletedBy: assigneeID,
				CompletedAt: workflow.Now(ctx).Format(time.RFC3339),
			}, nil

		case "reject":
			currentStatus = "in_progress"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify assignee of rejection
			if assigneeID != "" {
				err = workflow.ExecuteActivity(ctx, "NotifyUser", assigneeID, "task_rejected", map[string]string{
					"task_id":     input.TaskID,
					"title":       input.Title,
					"rejected_by": signal.UserID,
					"comment":     signal.Comment,
				}).Get(ctx, nil)
				if err != nil {
					logger.Warn("Failed to notify assignee", "error", err)
				}
			}

		case "block":
			currentStatus = "blocked"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify production manager
			err = workflow.ExecuteActivity(ctx, "NotifyRole",
				input.ProjectID, "production_manager", "task_blocked", map[string]string{
					"task_id":    input.TaskID,
					"title":      input.Title,
					"blocked_by": signal.UserID,
					"reason":     signal.Comment,
				}).Get(ctx, nil)
			if err != nil {
				logger.Warn("Failed to notify about block", "error", err)
			}

		case "unblock":
			currentStatus = "in_progress"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			// Notify assignee
			if assigneeID != "" {
				err = workflow.ExecuteActivity(ctx, "NotifyUser", assigneeID, "task_unblocked", map[string]string{
					"task_id": input.TaskID,
					"title":   input.Title,
				}).Get(ctx, nil)
				if err != nil {
					logger.Warn("Failed to notify assignee", "error", err)
				}
			}

		case "cancel":
			currentStatus = "cancelled"

			err := workflow.ExecuteActivity(ctx, "UpdateTaskStatus", input.TaskID, currentStatus).Get(ctx, nil)
			if err != nil {
				logger.Error("Failed to update status", "error", err)
			}

			logger.Info("TaskWorkflow cancelled", "taskID", input.TaskID)
			return &TaskWorkflowResult{
				Status: currentStatus,
			}, nil
		}
	}
}
