package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"connectrpc.com/connect"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListScenarios lists scenarios for a project
func (s *StoryboardService) ListScenarios(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListScenariosRequest],
) (*connect.Response[storyboardv1.ListScenariosResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scenarios, err := s.queries.ListScenarios(ctx, projectID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbScenarios := make([]*storyboardv1.Scenario, 0, len(scenarios))
	for _, sc := range scenarios {
		pbScenarios = append(pbScenarios, &storyboardv1.Scenario{
			Id:          sc.ID.String(),
			ProjectId:   sc.ProjectID.String(),
			Title:       sc.Title,
			Description: sc.Description,
			CreatedAt:   sc.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   sc.UpdatedAt.Format(time.RFC3339),
		})
	}

	return connect.NewResponse(&storyboardv1.ListScenariosResponse{
		Scenarios: pbScenarios,
	}), nil
}

// GetScenario retrieves a scenario by ID
func (s *StoryboardService) GetScenario(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetScenarioRequest],
) (*connect.Response[storyboardv1.Scenario], error) {
	scenarioID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	sc, err := s.queries.GetScenario(ctx, scenarioID)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          sc.ID.String(),
		ProjectId:   sc.ProjectID.String(),
		Title:       sc.Title,
		Description: sc.Description,
		CreatedAt:   sc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   sc.UpdatedAt.Format(time.RFC3339),
	}), nil
}

// CreateScenario creates a new scenario
func (s *StoryboardService) CreateScenario(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateScenarioRequest],
) (*connect.Response[storyboardv1.Scenario], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	var orgIDPtr *string
	if orgID != "" {
		orgIDPtr = &orgID
	}

	sc, err := s.queries.CreateScenario(ctx, sqlc.CreateScenarioParams{
		ProjectID:   projectID,
		Title:       req.Msg.Title,
		Description: req.Msg.Description,
		OrgID:       orgIDPtr,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          sc.ID.String(),
		ProjectId:   sc.ProjectID.String(),
		Title:       sc.Title,
		Description: sc.Description,
		CreatedAt:   sc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   sc.UpdatedAt.Format(time.RFC3339),
	}), nil
}

// UpdateScenario updates an existing scenario
func (s *StoryboardService) UpdateScenario(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateScenarioRequest],
) (*connect.Response[storyboardv1.Scenario], error) {
	scenarioID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	sc, err := s.queries.UpdateScenario(ctx, sqlc.UpdateScenarioParams{
		ID:          scenarioID,
		Title:       req.Msg.Title,
		Description: req.Msg.Description,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          sc.ID.String(),
		ProjectId:   sc.ProjectID.String(),
		Title:       sc.Title,
		Description: sc.Description,
		CreatedAt:   sc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   sc.UpdatedAt.Format(time.RFC3339),
	}), nil
}

// DeleteScenario deletes a scenario
func (s *StoryboardService) DeleteScenario(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteScenarioRequest],
) (*connect.Response[storyboardv1.DeleteScenarioResponse], error) {
	scenarioID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteScenario(ctx, scenarioID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteScenarioResponse{
		Success: true,
	}), nil
}
