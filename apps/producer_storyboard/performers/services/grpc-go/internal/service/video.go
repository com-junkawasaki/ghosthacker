package service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"go.temporal.io/sdk/client"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
)

// GenerateVideo generates a video using the specified provider via Temporal workflow
func (s *StoryboardService) GenerateVideo(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateVideoRequest],
) (*connect.Response[storyboardv1.GenerateVideoResponse], error) {
	orgID := auth.GetOrgIDFromContext(ctx)
	if orgID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("organization ID is required"))
	}

	storyboardID, err := uuid.Parse(req.Msg.StoryboardId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid storyboard ID: %w", err))
	}

	// Determine provider string
	provider := "runway"
	switch req.Msg.Provider {
	case storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_RUNWAY:
		provider = "runway"
	case storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_OPENAI:
		return nil, connect.NewError(connect.CodeUnimplemented, fmt.Errorf("OpenAI video generation not yet implemented"))
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid provider"))
	}

	// Prepare parameters
	params := make(map[string]interface{})
	if req.Msg.Params.GetRunway() != nil {
		runwayParams := req.Msg.Params.GetRunway()
		params["promptText"] = runwayParams.PromptText
		if runwayParams.Model != nil {
			params["model"] = *runwayParams.Model
		}
		if runwayParams.Duration != nil {
			params["duration"] = float64(*runwayParams.Duration)
		}
		if runwayParams.AspectRatio != nil {
			params["aspectRatio"] = *runwayParams.AspectRatio
		}
		if runwayParams.PromptImageUrl != nil {
			params["promptImageUrl"] = *runwayParams.PromptImageUrl
		}
		if runwayParams.Seed != nil {
			params["seed"] = float64(*runwayParams.Seed)
		}
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("video-gen-%s-%s", storyboardID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.VideoGenerationWorkflow, workflows.VideoGenerationWorkflowInput{
		StoryboardID: storyboardID.String(),
		Provider:     provider,
		Params:       params,
		OrgID:        orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete (with timeout)
	var result workflows.VideoGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Query the generated video from database
	video, err := s.queries.GetGeneratedVideoByRunwayTaskID(ctx, stringToPgText(&result.ProviderID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.GenerateVideoResponse{
		Id:         pgUUIDToString(video.ID),
		TaskId:     result.ProviderID,
		Status:     result.Status,
		Provider:   req.Msg.Provider,
		WorkflowId: we.GetID(),
		RunId:      we.GetRunID(),
	}), nil
}

// GetVideoTaskStatus checks the status of a video generation task via Temporal workflow
func (s *StoryboardService) GetVideoTaskStatus(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetVideoTaskStatusRequest],
) (*connect.Response[storyboardv1.GetVideoTaskStatusResponse], error) {
	// Query video from database by task ID
	video, err := s.queries.GetGeneratedVideoByRunwayTaskID(ctx, stringToPgText(&req.Msg.TaskId))
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("video not found: %w", err))
	}

	// Return database status (workflow updates it automatically)
	videoURLs := []string{}
	if video.VideoUrl.Valid && video.VideoUrl.String != "" {
		videoURLs = []string{video.VideoUrl.String}
	}

	return connect.NewResponse(&storyboardv1.GetVideoTaskStatusResponse{
		TaskId:       req.Msg.TaskId,
		Status:       video.Status,
		VideoUrls:    videoURLs,
		ErrorMessage: pgTextToString(video.ErrorMessage),
	}), nil
}

// ListGeneratedVideos lists all generated videos for a storyboard
func (s *StoryboardService) ListGeneratedVideos(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListGeneratedVideosRequest],
) (*connect.Response[storyboardv1.ListGeneratedVideosResponse], error) {
	storyboardID, err := uuid.Parse(req.Msg.StoryboardId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid storyboard ID: %w", err))
	}

	videos, err := s.queries.ListGeneratedVideos(ctx, pgtype.UUID{Bytes: storyboardID, Valid: true})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to list videos: %w", err))
	}

	pbVideos := make([]*storyboardv1.GeneratedVideo, 0, len(videos))
	for _, v := range videos {
		pbVideos = append(pbVideos, &storyboardv1.GeneratedVideo{
			Id:              pgUUIDToString(v.ID),
			StoryboardId:    pgUUIDToString(v.StoryboardID),
			VariationNumber: v.VariationNumber.Int32,
			VideoUrl:        pgTextToString(v.VideoUrl),
			Status:          v.Status,
			ErrorMessage:    pgTextToString(v.ErrorMessage),
			CreatedAt:       pgTimestamptzToString(v.CreatedAt),
			Provider:        mapProviderToProto(*pgTextToString(v.Provider)),
			Model:           pgTextToString(v.Model),
			Duration:        pgInt4ToInt32Ptr(v.Duration),
		})
	}

	return connect.NewResponse(&storyboardv1.ListGeneratedVideosResponse{
		Videos: pbVideos,
	}), nil
}

// GetGeneratedVideo gets a specific generated video
func (s *StoryboardService) GetGeneratedVideo(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetGeneratedVideoRequest],
) (*connect.Response[storyboardv1.GeneratedVideo], error) {
	videoID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid video ID: %w", err))
	}

	video, err := s.queries.GetGeneratedVideo(ctx, pgtype.UUID{Bytes: videoID, Valid: true})
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("video not found: %w", err))
	}

	return connect.NewResponse(&storyboardv1.GeneratedVideo{
		Id:              pgUUIDToString(video.ID),
		StoryboardId:    pgUUIDToString(video.StoryboardID),
		VariationNumber: video.VariationNumber.Int32,
		VideoUrl:        pgTextToString(video.VideoUrl),
		Status:          video.Status,
		ErrorMessage:    pgTextToString(video.ErrorMessage),
		CreatedAt:       pgTimestamptzToString(video.CreatedAt),
		Provider:        mapProviderToProto(*pgTextToString(video.Provider)),
		Model:           pgTextToString(video.Model),
		Duration:        pgInt4ToInt32Ptr(video.Duration),
		RunwayTaskId:    pgTextToString(video.RunwayTaskID),
	}), nil
}

// DeleteGeneratedVideo deletes a generated video
func (s *StoryboardService) DeleteGeneratedVideo(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteGeneratedVideoRequest],
) (*connect.Response[storyboardv1.DeleteGeneratedVideoResponse], error) {
	videoID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid video ID: %w", err))
	}

	err = s.queries.DeleteGeneratedVideo(ctx, pgtype.UUID{Bytes: videoID, Valid: true})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to delete video: %w", err))
	}

	return connect.NewResponse(&storyboardv1.DeleteGeneratedVideoResponse{
		Success: true,
	}), nil
}

// Helper functions

func mapRunwayStatus(status string) string {
	switch status {
	case "PENDING", "RUNNING":
		return "processing"
	case "SUCCEEDED":
		return "completed"
	case "FAILED":
		return "failed"
	default:
		return "pending"
	}
}

func mapProviderToProto(provider string) storyboardv1.VideoGenerationProvider {
	if provider == "" {
		return storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_UNSPECIFIED
	}
	switch provider {
	case "runway":
		return storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_RUNWAY
	case "openai":
		return storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_OPENAI
	default:
		return storyboardv1.VideoGenerationProvider_VIDEO_GENERATION_PROVIDER_UNSPECIFIED
	}
}

func stringOrDefault(s *string, def string) string {
	if s == nil || *s == "" {
		return def
	}
	return *s
}

func int32OrDefault(i *int32, def int32) int32 {
	if i == nil || *i == 0 {
		return def
	}
	return *i
}

func pgInt4ToInt32Ptr(i pgtype.Int4) *int32 {
	if !i.Valid {
		return nil
	}
	return &i.Int32
}
