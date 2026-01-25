package service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"go.temporal.io/sdk/client"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
	"github.com/jackc/pgx/v5/pgtype"
)

// StartApprovalWorkflow starts a new approval workflow
func (s *StoryboardService) StartApprovalWorkflow(
	ctx context.Context,
	req *connect.Request[storyboardv1.StartApprovalWorkflowRequest],
) (*connect.Response[storyboardv1.StartApprovalWorkflowResponse], error) {
	userID := auth.GetUserIDFromContext(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	resourceID, err := uuid.Parse(req.Msg.ResourceId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Get submitter team member ID
	var submitterID pgtype.UUID
	err = s.db.QueryRow(ctx, `
		SELECT id FROM team_members WHERE user_id = $1
	`, userID).Scan(&submitterID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("team member not found for user"))
	}

	// Create approval request in database
	var approval storyboardv1.ApprovalRequest
	var id pgtype.UUID
	var episodeIDPg pgtype.UUID
	var createdAt, updatedAt pgtype.Timestamptz
	approvalType := approvalTypeToString(req.Msg.Type)

	var episodeID interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}

	err = s.db.QueryRow(ctx, `
		INSERT INTO approval_requests (project_id, episode_id, type, submitter_id, resource_id, resource_type, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
		RETURNING id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
	`, projectID, episodeID, approvalType, submitterID, resourceID, req.Msg.ResourceType).Scan(
		&id, &approval.ProjectId, &episodeIDPg, &approval.ResourceType, &approval.SubmitterId,
		&approval.ResourceId, &approval.ResourceType, &approval.Status,
		&approval.WorkflowId, &approval.RunId, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	approval.Id = pgUUIDToString(id)
	approval.Type = req.Msg.Type
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		approval.EpisodeId = &episodeIDStr
	}
	if createdAt.Valid {
		approval.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		approval.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("approval-%s", approval.Id),
		TaskQueue: temporal.TaskQueue,
	}

	episodeIDStr := ""
	if approval.EpisodeId != nil {
		episodeIDStr = *approval.EpisodeId
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ApprovalWorkflow, workflows.ApprovalWorkflowInput{
		ApprovalID:   approval.Id,
		ProjectID:    approval.ProjectId,
		EpisodeID:    episodeIDStr,
		Type:         approvalType,
		SubmitterID:  approval.SubmitterId,
		ResourceID:   approval.ResourceId,
		ResourceType: approval.ResourceType,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update approval with workflow info
	_, err = s.db.Exec(ctx, `
		UPDATE approval_requests SET workflow_id = $2, run_id = $3 WHERE id = $1
	`, id, we.GetID(), we.GetRunID())
	if err != nil {
		// Log but continue
	}

	approval.WorkflowId = we.GetID()
	approval.RunId = we.GetRunID()

	return connect.NewResponse(&storyboardv1.StartApprovalWorkflowResponse{
		WorkflowId: we.GetID(),
		RunId:      we.GetRunID(),
		Approval:   &approval,
	}), nil
}

// SubmitApprovalAction submits an approval action (approve, reject, request_changes)
func (s *StoryboardService) SubmitApprovalAction(
	ctx context.Context,
	req *connect.Request[storyboardv1.SubmitApprovalActionRequest],
) (*connect.Response[storyboardv1.ApprovalRequest], error) {
	userID := auth.GetUserIDFromContext(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user not authenticated"))
	}

	approvalID, err := uuid.Parse(req.Msg.ApprovalId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Get reviewer team member ID
	var reviewerID pgtype.UUID
	err = s.db.QueryRow(ctx, `SELECT id FROM team_members WHERE user_id = $1`, userID).Scan(&reviewerID)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("team member not found"))
	}

	// Get the approval request
	var approval storyboardv1.ApprovalRequest
	var id pgtype.UUID
	var episodeIDPg pgtype.UUID
	var createdAt, updatedAt pgtype.Timestamptz
	var approvalType string

	err = s.db.QueryRow(ctx, `
		SELECT id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
		FROM approval_requests WHERE id = $1
	`, approvalID).Scan(
		&id, &approval.ProjectId, &episodeIDPg, &approvalType, &approval.SubmitterId,
		&approval.ResourceId, &approval.ResourceType, &approval.Status,
		&approval.WorkflowId, &approval.RunId, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	approval.Id = pgUUIDToString(id)
	approval.Type = parseApprovalType(approvalType)

	// Create approval action record
	_, err = s.db.Exec(ctx, `
		INSERT INTO approval_actions (approval_id, reviewer_id, action, comment)
		VALUES ($1, $2, $3, $4)
	`, approvalID, reviewerID, approvalStatusToString(req.Msg.Action), req.Msg.Comment)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Signal the Temporal workflow
	if approval.WorkflowId != "" {
		signal := workflows.ApprovalSignal{
			Action:     approvalActionToString(req.Msg.Action),
			ReviewerID: pgUUIDToString(reviewerID),
			Comment:    req.Msg.Comment,
		}

		err = s.temporalClient.SignalWorkflow(ctx, approval.WorkflowId, approval.RunId, "approval_action", signal)
		if err != nil {
			// Log but continue
		}
	}

	// Update status directly if workflow not available
	newStatus := approvalStatusToString(req.Msg.Action)
	_, err = s.db.Exec(ctx, `
		UPDATE approval_requests SET status = $2, updated_at = NOW() WHERE id = $1
	`, approvalID, newStatus)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	approval.Status = parseApprovalStatus(newStatus)

	return connect.NewResponse(&approval), nil
}

// ListApprovalRequests lists approval requests for a project
func (s *StoryboardService) ListApprovalRequests(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListApprovalRequestsRequest],
) (*connect.Response[storyboardv1.ListApprovalRequestsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var episodeID, status, approvalType interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}
	if req.Msg.Status != nil {
		status = approvalStatusToString(*req.Msg.Status)
	}
	if req.Msg.Type != nil {
		approvalType = approvalTypeToString(*req.Msg.Type)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
		FROM approval_requests
		WHERE project_id = $1
		  AND ($2::uuid IS NULL OR episode_id = $2)
		  AND ($3::text IS NULL OR status = $3)
		  AND ($4::text IS NULL OR type = $4)
		ORDER BY created_at DESC
	`, projectID, episodeID, status, approvalType)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var requests []*storyboardv1.ApprovalRequest
	for rows.Next() {
		var a storyboardv1.ApprovalRequest
		var id pgtype.UUID
		var episodeIDPg pgtype.UUID
		var createdAt, updatedAt pgtype.Timestamptz
		var aType, aStatus string
		var workflowID, runID pgtype.Text

		err := rows.Scan(&id, &a.ProjectId, &episodeIDPg, &aType, &a.SubmitterId, &a.ResourceId, &a.ResourceType, &aStatus, &workflowID, &runID, &createdAt, &updatedAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		a.Id = pgUUIDToString(id)
		a.Type = parseApprovalType(aType)
		a.Status = parseApprovalStatus(aStatus)
		if episodeIDPg.Valid {
			episodeIDStr := pgUUIDToString(episodeIDPg)
			a.EpisodeId = &episodeIDStr
		}
		if workflowID.Valid {
			a.WorkflowId = workflowID.String
		}
		if runID.Valid {
			a.RunId = runID.String
		}
		if createdAt.Valid {
			a.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if updatedAt.Valid {
			a.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		requests = append(requests, &a)
	}

	return connect.NewResponse(&storyboardv1.ListApprovalRequestsResponse{
		Requests: requests,
	}), nil
}

// GetApprovalRequest gets a specific approval request
func (s *StoryboardService) GetApprovalRequest(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetApprovalRequestRequest],
) (*connect.Response[storyboardv1.ApprovalRequest], error) {
	approvalID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var approval storyboardv1.ApprovalRequest
	var id pgtype.UUID
	var episodeIDPg pgtype.UUID
	var createdAt, updatedAt pgtype.Timestamptz
	var aType, aStatus string
	var workflowID, runID pgtype.Text

	err = s.db.QueryRow(ctx, `
		SELECT id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
		FROM approval_requests WHERE id = $1
	`, approvalID).Scan(&id, &approval.ProjectId, &episodeIDPg, &aType, &approval.SubmitterId, &approval.ResourceId, &approval.ResourceType, &aStatus, &workflowID, &runID, &createdAt, &updatedAt)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	approval.Id = pgUUIDToString(id)
	approval.Type = parseApprovalType(aType)
	approval.Status = parseApprovalStatus(aStatus)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		approval.EpisodeId = &episodeIDStr
	}
	if workflowID.Valid {
		approval.WorkflowId = workflowID.String
	}
	if runID.Valid {
		approval.RunId = runID.String
	}
	if createdAt.Valid {
		approval.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		approval.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return connect.NewResponse(&approval), nil
}

// ListApprovalActions lists actions for an approval request
func (s *StoryboardService) ListApprovalActions(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListApprovalActionsRequest],
) (*connect.Response[storyboardv1.ListApprovalActionsResponse], error) {
	approvalID, err := uuid.Parse(req.Msg.ApprovalId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, approval_id, reviewer_id, action, comment, created_at
		FROM approval_actions
		WHERE approval_id = $1
		ORDER BY created_at ASC
	`, approvalID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var actions []*storyboardv1.ApprovalAction
	for rows.Next() {
		var a storyboardv1.ApprovalAction
		var id, approvalIDPg, reviewerID pgtype.UUID
		var action string
		var comment pgtype.Text
		var createdAt pgtype.Timestamptz

		err := rows.Scan(&id, &approvalIDPg, &reviewerID, &action, &comment, &createdAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		a.Id = pgUUIDToString(id)
		a.ApprovalId = pgUUIDToString(approvalIDPg)
		a.ReviewerId = pgUUIDToString(reviewerID)
		a.Action = parseApprovalStatus(action)
		if comment.Valid {
			a.Comment = comment.String
		}
		if createdAt.Valid {
			a.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		actions = append(actions, &a)
	}

	return connect.NewResponse(&storyboardv1.ListApprovalActionsResponse{
		Actions: actions,
	}), nil
}

// StartProductionWorkflow starts a production workflow for an episode
func (s *StoryboardService) StartProductionWorkflow(
	ctx context.Context,
	req *connect.Request[storyboardv1.StartProductionWorkflowRequest],
) (*connect.Response[storyboardv1.StartProductionWorkflowResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	episodeID, err := uuid.Parse(req.Msg.EpisodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Create production record
	var production storyboardv1.EpisodeProduction
	var id pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz

	err = s.db.QueryRow(ctx, `
		INSERT INTO episode_productions (project_id, episode_id, status, deadline)
		VALUES ($1, $2, 'planning', $3)
		RETURNING id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
	`, projectID, episodeID, req.Msg.Deadline).Scan(
		&id, &production.ProjectId, &production.EpisodeId, &production.Status,
		&deadline, &production.ProgressPercent, &production.WorkflowId, &production.RunId,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	production.Id = pgUUIDToString(id)
	if deadline.Valid {
		production.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if createdAt.Valid {
		production.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		production.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("production-%s-%s", production.ProjectId, production.EpisodeId),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ProductionWorkflow, workflows.ProductionWorkflowInput{
		ProjectID: production.ProjectId,
		EpisodeID: production.EpisodeId,
		Deadline:  production.Deadline,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update with workflow info
	_, err = s.db.Exec(ctx, `
		UPDATE episode_productions SET workflow_id = $3, run_id = $4 WHERE project_id = $1 AND episode_id = $2
	`, projectID, episodeID, we.GetID(), we.GetRunID())
	if err != nil {
		// Log but continue
	}

	production.WorkflowId = we.GetID()
	production.RunId = we.GetRunID()

	return connect.NewResponse(&storyboardv1.StartProductionWorkflowResponse{
		WorkflowId: we.GetID(),
		RunId:      we.GetRunID(),
		Production: &production,
	}), nil
}

// GetEpisodeProduction gets the production status for an episode
func (s *StoryboardService) GetEpisodeProduction(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetEpisodeProductionRequest],
) (*connect.Response[storyboardv1.EpisodeProduction], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	episodeID, err := uuid.Parse(req.Msg.EpisodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var production storyboardv1.EpisodeProduction
	var id pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowID, runID pgtype.Text

	err = s.db.QueryRow(ctx, `
		SELECT id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
		FROM episode_productions WHERE project_id = $1 AND episode_id = $2
	`, projectID, episodeID).Scan(
		&id, &production.ProjectId, &production.EpisodeId, &production.Status,
		&deadline, &production.ProgressPercent, &workflowID, &runID,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	production.Id = pgUUIDToString(id)
	if deadline.Valid {
		production.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if workflowID.Valid {
		production.WorkflowId = workflowID.String
	}
	if runID.Valid {
		production.RunId = runID.String
	}
	if createdAt.Valid {
		production.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		production.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return connect.NewResponse(&production), nil
}

// ListEpisodeProductions lists all productions for a project
func (s *StoryboardService) ListEpisodeProductions(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListEpisodeProductionsRequest],
) (*connect.Response[storyboardv1.ListEpisodeProductionsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
		FROM episode_productions WHERE project_id = $1 ORDER BY created_at ASC
	`, projectID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var productions []*storyboardv1.EpisodeProduction
	for rows.Next() {
		var p storyboardv1.EpisodeProduction
		var id pgtype.UUID
		var deadline, createdAt, updatedAt pgtype.Timestamptz
		var workflowID, runID pgtype.Text

		err := rows.Scan(&id, &p.ProjectId, &p.EpisodeId, &p.Status, &deadline, &p.ProgressPercent, &workflowID, &runID, &createdAt, &updatedAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		p.Id = pgUUIDToString(id)
		if deadline.Valid {
			p.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
		}
		if workflowID.Valid {
			p.WorkflowId = workflowID.String
		}
		if runID.Valid {
			p.RunId = runID.String
		}
		if createdAt.Valid {
			p.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if updatedAt.Valid {
			p.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		productions = append(productions, &p)
	}

	return connect.NewResponse(&storyboardv1.ListEpisodeProductionsResponse{
		Productions: productions,
	}), nil
}

// UpdateProductionStatus updates the production status
func (s *StoryboardService) UpdateProductionStatus(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateProductionStatusRequest],
) (*connect.Response[storyboardv1.EpisodeProduction], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	episodeID, err := uuid.Parse(req.Msg.EpisodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	status := productionStatusToString(req.Msg.Status)
	var progress interface{}
	if req.Msg.ProgressPercent != nil {
		progress = *req.Msg.ProgressPercent
	}

	var production storyboardv1.EpisodeProduction
	var id pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowID, runID pgtype.Text

	err = s.db.QueryRow(ctx, `
		UPDATE episode_productions
		SET status = $3, progress_percent = COALESCE($4, progress_percent), updated_at = NOW()
		WHERE project_id = $1 AND episode_id = $2
		RETURNING id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
	`, projectID, episodeID, status, progress).Scan(
		&id, &production.ProjectId, &production.EpisodeId, &production.Status,
		&deadline, &production.ProgressPercent, &workflowID, &runID,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	production.Id = pgUUIDToString(id)
	if deadline.Valid {
		production.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if workflowID.Valid {
		production.WorkflowId = workflowID.String
	}
	if runID.Valid {
		production.RunId = runID.String
	}
	if createdAt.Valid {
		production.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		production.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Signal the workflow if it exists
	if production.WorkflowId != "" {
		signal := workflows.ProductionSignal{
			Action:          "advance",
			NextStatus:      status,
			ProgressPercent: production.ProgressPercent,
		}

		_ = s.temporalClient.SignalWorkflow(ctx, production.WorkflowId, production.RunId, "production_action", signal)
	}

	return connect.NewResponse(&production), nil
}

// StartTaskWorkflow starts a new task workflow
func (s *StoryboardService) StartTaskWorkflow(
	ctx context.Context,
	req *connect.Request[storyboardv1.StartTaskWorkflowRequest],
) (*connect.Response[storyboardv1.StartTaskWorkflowResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	roleID, err := uuid.Parse(req.Msg.RoleId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var episodeID interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}

	// Create task record
	var task storyboardv1.Task
	var id, episodeIDPg, assigneeID, roleIDPg pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowIDPg, runIDPg, description pgtype.Text

	err = s.db.QueryRow(ctx, `
		INSERT INTO tasks (project_id, episode_id, title, description, role_id, status, deadline)
		VALUES ($1, $2, $3, $4, $5, 'created', $6)
		RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
	`, projectID, episodeID, req.Msg.Title, req.Msg.Description, roleID, req.Msg.Deadline).Scan(
		&id, &task.ProjectId, &episodeIDPg, &task.Title, &description,
		&assigneeID, &roleIDPg, &task.Status, &deadline,
		&workflowIDPg, &runIDPg, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	task.Id = pgUUIDToString(id)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		task.EpisodeId = &episodeIDStr
	}
	if description.Valid {
		task.Description = description.String
	}
	if assigneeID.Valid {
		task.AssigneeId = pgUUIDToString(assigneeID)
	}
	task.RoleId = pgUUIDToString(roleIDPg)
	if deadline.Valid {
		task.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if createdAt.Valid {
		task.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("task-%s", task.Id),
		TaskQueue: temporal.TaskQueue,
	}

	episodeIDStr := ""
	if task.EpisodeId != nil {
		episodeIDStr = *task.EpisodeId
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.TaskWorkflow, workflows.TaskWorkflowInput{
		TaskID:      task.Id,
		ProjectID:   task.ProjectId,
		EpisodeID:   episodeIDStr,
		Title:       task.Title,
		Description: task.Description,
		RoleID:      task.RoleId,
		Deadline:    task.Deadline,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update with workflow info
	_, err = s.db.Exec(ctx, `UPDATE tasks SET workflow_id = $2, run_id = $3 WHERE id = $1`, id, we.GetID(), we.GetRunID())
	if err != nil {
		// Log but continue
	}

	task.WorkflowId = we.GetID()
	task.RunId = we.GetRunID()

	return connect.NewResponse(&storyboardv1.StartTaskWorkflowResponse{
		WorkflowId: we.GetID(),
		RunId:      we.GetRunID(),
		Task:       &task,
	}), nil
}

// AssignTask assigns a task to a team member
func (s *StoryboardService) AssignTask(
	ctx context.Context,
	req *connect.Request[storyboardv1.AssignTaskRequest],
) (*connect.Response[storyboardv1.Task], error) {
	taskID, err := uuid.Parse(req.Msg.TaskId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	assigneeID, err := uuid.Parse(req.Msg.AssigneeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var task storyboardv1.Task
	var id, episodeIDPg, assigneeIDPg, roleID pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowIDPg, runIDPg, description pgtype.Text

	err = s.db.QueryRow(ctx, `
		UPDATE tasks
		SET assignee_id = $2, status = CASE WHEN status = 'created' THEN 'assigned' ELSE status END, updated_at = NOW()
		WHERE id = $1
		RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
	`, taskID, assigneeID).Scan(
		&id, &task.ProjectId, &episodeIDPg, &task.Title, &description,
		&assigneeIDPg, &roleID, &task.Status, &deadline,
		&workflowIDPg, &runIDPg, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	task.Id = pgUUIDToString(id)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		task.EpisodeId = &episodeIDStr
	}
	if description.Valid {
		task.Description = description.String
	}
	if assigneeIDPg.Valid {
		task.AssigneeId = pgUUIDToString(assigneeIDPg)
	}
	task.RoleId = pgUUIDToString(roleID)
	if deadline.Valid {
		task.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if workflowIDPg.Valid {
		task.WorkflowId = workflowIDPg.String
	}
	if runIDPg.Valid {
		task.RunId = runIDPg.String
	}
	if createdAt.Valid {
		task.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Signal the workflow
	if task.WorkflowId != "" {
		signal := workflows.TaskSignal{
			Action: "assign",
			UserID: task.AssigneeId,
		}

		_ = s.temporalClient.SignalWorkflow(ctx, task.WorkflowId, task.RunId, "task_action", signal)
	}

	return connect.NewResponse(&task), nil
}

// UpdateTaskStatus updates a task's status
func (s *StoryboardService) UpdateTaskStatus(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateTaskStatusRequest],
) (*connect.Response[storyboardv1.Task], error) {
	taskID, err := uuid.Parse(req.Msg.TaskId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	status := taskStatusToString(req.Msg.Status)

	var task storyboardv1.Task
	var id, episodeIDPg, assigneeID, roleID pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowIDPg, runIDPg, description pgtype.Text

	err = s.db.QueryRow(ctx, `
		UPDATE tasks SET status = $2, updated_at = NOW() WHERE id = $1
		RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
	`, taskID, status).Scan(
		&id, &task.ProjectId, &episodeIDPg, &task.Title, &description,
		&assigneeID, &roleID, &task.Status, &deadline,
		&workflowIDPg, &runIDPg, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	task.Id = pgUUIDToString(id)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		task.EpisodeId = &episodeIDStr
	}
	if description.Valid {
		task.Description = description.String
	}
	if assigneeID.Valid {
		task.AssigneeId = pgUUIDToString(assigneeID)
	}
	task.RoleId = pgUUIDToString(roleID)
	if deadline.Valid {
		task.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if workflowIDPg.Valid {
		task.WorkflowId = workflowIDPg.String
	}
	if runIDPg.Valid {
		task.RunId = runIDPg.String
	}
	if createdAt.Valid {
		task.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	// Signal the workflow
	if task.WorkflowId != "" {
		var action string
		switch req.Msg.Status {
		case storyboardv1.TaskStatus_TASK_STATUS_IN_PROGRESS:
			action = "start"
		case storyboardv1.TaskStatus_TASK_STATUS_REVIEW:
			action = "submit"
		case storyboardv1.TaskStatus_TASK_STATUS_COMPLETED:
			action = "approve"
		case storyboardv1.TaskStatus_TASK_STATUS_BLOCKED:
			action = "block"
		case storyboardv1.TaskStatus_TASK_STATUS_CANCELLED:
			action = "cancel"
		default:
			action = ""
		}

		if action != "" {
			signal := workflows.TaskSignal{
				Action: action,
			}
			_ = s.temporalClient.SignalWorkflow(ctx, task.WorkflowId, task.RunId, "task_action", signal)
		}
	}

	return connect.NewResponse(&task), nil
}

// ListTasks lists tasks for a project
func (s *StoryboardService) ListTasks(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListTasksRequest],
) (*connect.Response[storyboardv1.ListTasksResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var episodeID, assigneeID, status interface{}
	if req.Msg.EpisodeId != nil {
		parsedEpisodeID, parseErr := uuid.Parse(*req.Msg.EpisodeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		episodeID = parsedEpisodeID
	}
	if req.Msg.AssigneeId != nil {
		parsedAssigneeID, parseErr := uuid.Parse(*req.Msg.AssigneeId)
		if parseErr != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, parseErr)
		}
		assigneeID = parsedAssigneeID
	}
	if req.Msg.Status != nil {
		status = taskStatusToString(*req.Msg.Status)
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
		FROM tasks
		WHERE project_id = $1
		  AND ($2::uuid IS NULL OR episode_id = $2)
		  AND ($3::uuid IS NULL OR assignee_id = $3)
		  AND ($4::text IS NULL OR status = $4)
		ORDER BY created_at DESC
	`, projectID, episodeID, assigneeID, status)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var tasks []*storyboardv1.Task
	for rows.Next() {
		var t storyboardv1.Task
		var id, episodeIDPg, assigneeIDPg, roleID pgtype.UUID
		var deadline, createdAt, updatedAt pgtype.Timestamptz
		var workflowIDPg, runIDPg, description pgtype.Text

		err := rows.Scan(&id, &t.ProjectId, &episodeIDPg, &t.Title, &description, &assigneeIDPg, &roleID, &t.Status, &deadline, &workflowIDPg, &runIDPg, &createdAt, &updatedAt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		t.Id = pgUUIDToString(id)
		if episodeIDPg.Valid {
			episodeIDStr := pgUUIDToString(episodeIDPg)
			t.EpisodeId = &episodeIDStr
		}
		if description.Valid {
			t.Description = description.String
		}
		if assigneeIDPg.Valid {
			t.AssigneeId = pgUUIDToString(assigneeIDPg)
		}
		t.RoleId = pgUUIDToString(roleID)
		if deadline.Valid {
			t.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
		}
		if workflowIDPg.Valid {
			t.WorkflowId = workflowIDPg.String
		}
		if runIDPg.Valid {
			t.RunId = runIDPg.String
		}
		if createdAt.Valid {
			t.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if updatedAt.Valid {
			t.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
		}

		tasks = append(tasks, &t)
	}

	return connect.NewResponse(&storyboardv1.ListTasksResponse{
		Tasks: tasks,
	}), nil
}

// GetTask gets a specific task
func (s *StoryboardService) GetTask(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetTaskRequest],
) (*connect.Response[storyboardv1.Task], error) {
	taskID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var task storyboardv1.Task
	var id, episodeIDPg, assigneeID, roleID pgtype.UUID
	var deadline, createdAt, updatedAt pgtype.Timestamptz
	var workflowIDPg, runIDPg, description pgtype.Text

	err = s.db.QueryRow(ctx, `
		SELECT id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
		FROM tasks WHERE id = $1
	`, taskID).Scan(
		&id, &task.ProjectId, &episodeIDPg, &task.Title, &description,
		&assigneeID, &roleID, &task.Status, &deadline,
		&workflowIDPg, &runIDPg, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	task.Id = pgUUIDToString(id)
	if episodeIDPg.Valid {
		episodeIDStr := pgUUIDToString(episodeIDPg)
		task.EpisodeId = &episodeIDStr
	}
	if description.Valid {
		task.Description = description.String
	}
	if assigneeID.Valid {
		task.AssigneeId = pgUUIDToString(assigneeID)
	}
	task.RoleId = pgUUIDToString(roleID)
	if deadline.Valid {
		task.Deadline = deadline.Time.Format("2006-01-02T15:04:05Z")
	}
	if workflowIDPg.Valid {
		task.WorkflowId = workflowIDPg.String
	}
	if runIDPg.Valid {
		task.RunId = runIDPg.String
	}
	if createdAt.Valid {
		task.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.Time.Format("2006-01-02T15:04:05Z")
	}

	return connect.NewResponse(&task), nil
}

// Helper functions for workflow types

func approvalTypeToString(t storyboardv1.ApprovalType) string {
	switch t {
	case storyboardv1.ApprovalType_APPROVAL_TYPE_SCRIPT:
		return "script"
	case storyboardv1.ApprovalType_APPROVAL_TYPE_STORYBOARD:
		return "storyboard"
	case storyboardv1.ApprovalType_APPROVAL_TYPE_KEY_ANIMATION:
		return "key_animation"
	case storyboardv1.ApprovalType_APPROVAL_TYPE_AUDIO_MIX:
		return "audio_mix"
	case storyboardv1.ApprovalType_APPROVAL_TYPE_FINAL_CUT:
		return "final_cut"
	default:
		return ""
	}
}

func parseApprovalType(s string) storyboardv1.ApprovalType {
	switch s {
	case "script":
		return storyboardv1.ApprovalType_APPROVAL_TYPE_SCRIPT
	case "storyboard":
		return storyboardv1.ApprovalType_APPROVAL_TYPE_STORYBOARD
	case "key_animation":
		return storyboardv1.ApprovalType_APPROVAL_TYPE_KEY_ANIMATION
	case "audio_mix":
		return storyboardv1.ApprovalType_APPROVAL_TYPE_AUDIO_MIX
	case "final_cut":
		return storyboardv1.ApprovalType_APPROVAL_TYPE_FINAL_CUT
	default:
		return storyboardv1.ApprovalType_APPROVAL_TYPE_UNSPECIFIED
	}
}

func approvalStatusToString(s storyboardv1.ApprovalStatus) string {
	switch s {
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_SUBMITTED:
		return "submitted"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_UNDER_REVIEW:
		return "under_review"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_REQUEST_CHANGES:
		return "request_changes"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_APPROVED:
		return "approved"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_REJECTED:
		return "rejected"
	default:
		return ""
	}
}

func parseApprovalStatus(s string) storyboardv1.ApprovalStatus {
	switch s {
	case "submitted":
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_SUBMITTED
	case "under_review":
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_UNDER_REVIEW
	case "request_changes":
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_REQUEST_CHANGES
	case "approved":
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_APPROVED
	case "rejected":
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_REJECTED
	default:
		return storyboardv1.ApprovalStatus_APPROVAL_STATUS_UNSPECIFIED
	}
}

func approvalActionToString(s storyboardv1.ApprovalStatus) string {
	switch s {
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_APPROVED:
		return "approve"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_REJECTED:
		return "reject"
	case storyboardv1.ApprovalStatus_APPROVAL_STATUS_REQUEST_CHANGES:
		return "request_changes"
	default:
		return ""
	}
}

func productionStatusToString(s storyboardv1.ProductionStatus) string {
	switch s {
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_PLANNING:
		return "planning"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_SCRIPT:
		return "script"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_STORYBOARD:
		return "storyboard"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_LAYOUT:
		return "layout"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_KEY_ANIMATION:
		return "key_animation"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_IN_BETWEEN:
		return "in_between"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_COLORING:
		return "coloring"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_COMPOSITING:
		return "compositing"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_AUDIO_RECORDING:
		return "audio_recording"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_AUDIO_MIX:
		return "audio_mix"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_EDITING:
		return "editing"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_FINAL_CHECK:
		return "final_check"
	case storyboardv1.ProductionStatus_PRODUCTION_STATUS_DELIVERED:
		return "delivered"
	default:
		return ""
	}
}

func taskStatusToString(s storyboardv1.TaskStatus) string {
	switch s {
	case storyboardv1.TaskStatus_TASK_STATUS_CREATED:
		return "created"
	case storyboardv1.TaskStatus_TASK_STATUS_ASSIGNED:
		return "assigned"
	case storyboardv1.TaskStatus_TASK_STATUS_IN_PROGRESS:
		return "in_progress"
	case storyboardv1.TaskStatus_TASK_STATUS_BLOCKED:
		return "blocked"
	case storyboardv1.TaskStatus_TASK_STATUS_REVIEW:
		return "review"
	case storyboardv1.TaskStatus_TASK_STATUS_COMPLETED:
		return "completed"
	case storyboardv1.TaskStatus_TASK_STATUS_CANCELLED:
		return "cancelled"
	default:
		return ""
	}
}
