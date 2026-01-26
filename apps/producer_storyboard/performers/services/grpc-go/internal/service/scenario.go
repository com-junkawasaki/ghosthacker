package service

import (
	"context"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

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

	scenarios, err := s.queries.ListScenarios(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbScenarios := make([]*storyboardv1.Scenario, 0, len(scenarios))
	for _, sc := range scenarios {
		pbScenarios = append(pbScenarios, &storyboardv1.Scenario{
			Id:          pgUUIDToString(sc.ID),
			ProjectId:   pgUUIDToString(sc.ProjectID),
			Title:       sc.Title,
			Description: pgTextToString(sc.Description),
			CreatedAt:   pgTimestamptzToString(sc.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(sc.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListScenariosResponse{
		Scenarios: pbScenarios,
	}), nil
}

// GetScenario retrieves a scenario by ID with episodes, parts, and scene plans
func (s *StoryboardService) GetScenario(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetScenarioRequest],
) (*connect.Response[storyboardv1.Scenario], error) {
	scenarioID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scenarioIDPg := uuidToPgUUID(scenarioID)

	sc, err := s.queries.GetScenario(ctx, scenarioIDPg)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Fetch episodes
	episodesRows, err := s.queries.ListEpisodes(ctx, scenarioIDPg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	episodes := make([]*storyboardv1.Episode, 0, len(episodesRows))
	for _, epRow := range episodesRows {
		episodeIDPg := epRow.ID

		// Fetch parts for this episode
		partsRows, err := s.queries.ListParts(ctx, episodeIDPg)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}

		parts := make([]*storyboardv1.Part, 0, len(partsRows))
		for _, partRow := range partsRows {
			partIDPg := partRow.ID

			// Fetch scene plans for this part
			scenePlansRows, err := s.queries.ListScenePlans(ctx, partIDPg)
			if err != nil {
				return nil, connect.NewError(connect.CodeInternal, err)
			}

			scenePlans := make([]*storyboardv1.ScenePlan, 0, len(scenePlansRows))
			for _, spRow := range scenePlansRows {
				scenePlans = append(scenePlans, &storyboardv1.ScenePlan{
					Id:          pgUUIDToString(spRow.ID),
					PartId:      pgUUIDToString(spRow.PartID),
					Description: spRow.Description,
					OrderIndex:  int32(spRow.OrderIndex),
					CreatedAt:   pgTimestamptzToString(spRow.CreatedAt),
					UpdatedAt:   pgTimestamptzToString(spRow.UpdatedAt),
				})
			}

			parts = append(parts, &storyboardv1.Part{
				Id:          pgUUIDToString(partRow.ID),
				EpisodeId:   pgUUIDToString(partRow.EpisodeID),
				Title:       partRow.Title,
				Description: pgTextToString(partRow.Description),
				OrderIndex:  int32(partRow.OrderIndex),
				CreatedAt:   pgTimestamptzToString(partRow.CreatedAt),
				UpdatedAt:   pgTimestamptzToString(partRow.UpdatedAt),
				ScenePlans:  scenePlans,
			})
		}

		episodes = append(episodes, &storyboardv1.Episode{
			Id:          pgUUIDToString(epRow.ID),
			ScenarioId:  pgUUIDToString(epRow.ScenarioID),
			Title:       epRow.Title,
			Description: pgTextToString(epRow.Description),
			OrderIndex:  int32(epRow.OrderIndex),
			CreatedAt:   pgTimestamptzToString(epRow.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(epRow.UpdatedAt),
			Parts:       parts,
		})
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          pgUUIDToString(sc.ID),
		ProjectId:   pgUUIDToString(sc.ProjectID),
		Title:       sc.Title,
		Description: pgTextToString(sc.Description),
		CreatedAt:   pgTimestamptzToString(sc.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(sc.UpdatedAt),
		Episodes:    episodes,
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
	orgIDPg := stringToPgText(&orgID)

	sc, err := s.queries.CreateScenario(ctx, sqlc.CreateScenarioParams{
		ProjectID:   uuidToPgUUID(projectID),
		Title:       req.Msg.Title,
		Description: stringToPgText(req.Msg.Description),
		OrgID:       orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          pgUUIDToString(sc.ID),
		ProjectId:   pgUUIDToString(sc.ProjectID),
		Title:       sc.Title,
		Description: pgTextToString(sc.Description),
		CreatedAt:   pgTimestamptzToString(sc.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(sc.UpdatedAt),
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

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}
	sc, err := s.queries.UpdateScenario(ctx, sqlc.UpdateScenarioParams{
		ID:          uuidToPgUUID(scenarioID),
		Title:       title,
		Description: stringToPgText(req.Msg.Description),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Scenario{
		Id:          pgUUIDToString(sc.ID),
		ProjectId:   pgUUIDToString(sc.ProjectID),
		Title:       sc.Title,
		Description: pgTextToString(sc.Description),
		CreatedAt:   pgTimestamptzToString(sc.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(sc.UpdatedAt),
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

	err = s.queries.DeleteScenario(ctx, uuidToPgUUID(scenarioID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteScenarioResponse{
		Success: true,
	}), nil
}

// ReorderParts reorders parts within an episode
func (s *StoryboardService) ReorderParts(
	ctx context.Context,
	req *connect.Request[storyboardv1.ReorderPartsRequest],
) (*connect.Response[storyboardv1.ReorderPartsResponse], error) {
	episodeID, err := uuid.Parse(req.Msg.EpisodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	episodeIDPg := uuidToPgUUID(episodeID)

	// Verify episode exists and user has access
	_, err = s.queries.GetEpisode(ctx, episodeIDPg)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update order_index for each part
	for orderIndex, partIDStr := range req.Msg.PartIds {
		partID, err := uuid.Parse(partIDStr)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}

		err = s.queries.UpdatePartOrder(ctx, sqlc.UpdatePartOrderParams{
			OrderIndex: int32(orderIndex),
			ID:         uuidToPgUUID(partID),
			EpisodeID:  episodeIDPg,
		})
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&storyboardv1.ReorderPartsResponse{
		Success: true,
	}), nil
}

// ReorderScenePlans reorders scene plans within a part
func (s *StoryboardService) ReorderScenePlans(
	ctx context.Context,
	req *connect.Request[storyboardv1.ReorderScenePlansRequest],
) (*connect.Response[storyboardv1.ReorderScenePlansResponse], error) {
	partID, err := uuid.Parse(req.Msg.PartId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	partIDPg := uuidToPgUUID(partID)

	// Verify part exists and user has access
	_, err = s.queries.GetPart(ctx, partIDPg)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update order_index for each scene plan
	for orderIndex, scenePlanIDStr := range req.Msg.ScenePlanIds {
		scenePlanID, err := uuid.Parse(scenePlanIDStr)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}

		err = s.queries.UpdateScenePlanOrder(ctx, sqlc.UpdateScenePlanOrderParams{
			OrderIndex: int32(orderIndex),
			ID:         uuidToPgUUID(scenePlanID),
			PartID:     partIDPg,
		})
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&storyboardv1.ReorderScenePlansResponse{
		Success: true,
	}), nil
}
