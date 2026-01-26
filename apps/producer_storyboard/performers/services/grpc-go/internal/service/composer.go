package service

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.temporal.io/sdk/client"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
)

// ListComposers lists composers for a project
func (s *StoryboardService) ListComposers(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListComposersRequest],
) (*connect.Response[storyboardv1.ListComposersResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	composers, err := s.queries.ListComposers(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbComposers := make([]*storyboardv1.Composer, 0, len(composers))
	for _, c := range composers {
		pbComposers = append(pbComposers, &storyboardv1.Composer{
			Id:              pgUUIDToString(c.ID),
			ProjectId:       pgUUIDToString(c.ProjectID),
			Title:           c.Title,
			DurationSeconds: pgFloat8ToFloat64(c.DurationSeconds),
			CreatedAt:       pgTimestamptzToString(c.CreatedAt),
			UpdatedAt:       pgTimestamptzToString(c.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListComposersResponse{
		Composers: pbComposers,
	}), nil
}

// GetComposer retrieves a composer by ID
func (s *StoryboardService) GetComposer(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetComposerRequest],
) (*connect.Response[storyboardv1.Composer], error) {
	composerID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	c, err := s.queries.GetComposer(ctx, uuidToPgUUID(composerID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              pgUUIDToString(c.ID),
		ProjectId:       pgUUIDToString(c.ProjectID),
		Title:           c.Title,
		DurationSeconds: pgFloat8ToFloat64(c.DurationSeconds),
		CreatedAt:       pgTimestamptzToString(c.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(c.UpdatedAt),
	}), nil
}

// CreateComposer creates a new composer
func (s *StoryboardService) CreateComposer(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateComposerRequest],
) (*connect.Response[storyboardv1.Composer], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	c, err := s.queries.CreateComposer(ctx, sqlc.CreateComposerParams{
		ProjectID:       uuidToPgUUID(projectID),
		Title:           req.Msg.Title,
		DurationSeconds: float64ToPgFloat8(req.Msg.DurationSeconds),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              pgUUIDToString(c.ID),
		ProjectId:       pgUUIDToString(c.ProjectID),
		Title:           c.Title,
		DurationSeconds: pgFloat8ToFloat64(c.DurationSeconds),
		CreatedAt:       pgTimestamptzToString(c.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(c.UpdatedAt),
	}), nil
}

// UpdateComposer updates an existing composer
func (s *StoryboardService) UpdateComposer(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateComposerRequest],
) (*connect.Response[storyboardv1.Composer], error) {
	composerID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}
	c, err := s.queries.UpdateComposer(ctx, sqlc.UpdateComposerParams{
		ID:              uuidToPgUUID(composerID),
		Title:           title,
		DurationSeconds: float64ToPgFloat8(req.Msg.DurationSeconds),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              pgUUIDToString(c.ID),
		ProjectId:       pgUUIDToString(c.ProjectID),
		Title:           c.Title,
		DurationSeconds: pgFloat8ToFloat64(c.DurationSeconds),
		CreatedAt:       pgTimestamptzToString(c.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(c.UpdatedAt),
	}), nil
}

// DeleteComposer deletes a composer
func (s *StoryboardService) DeleteComposer(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteComposerRequest],
) (*connect.Response[storyboardv1.DeleteComposerResponse], error) {
	composerID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteComposer(ctx, uuidToPgUUID(composerID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteComposerResponse{
		Success: true,
	}), nil
}

// ListAudioTracks lists audio tracks for a composer
func (s *StoryboardService) ListAudioTracks(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListAudioTracksRequest],
) (*connect.Response[storyboardv1.ListAudioTracksResponse], error) {
	composerID, err := uuid.Parse(req.Msg.ComposerId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	tracks, err := s.queries.ListAudioTracks(ctx, uuidToPgUUID(composerID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbTracks := make([]*storyboardv1.AudioTrack, 0, len(tracks))
	for _, t := range tracks {
		pbTracks = append(pbTracks, &storyboardv1.AudioTrack{
			Id:          pgUUIDToString(t.ID),
			ComposerId:  pgUUIDToString(t.ComposerID),
			TrackNumber: int32(t.TrackNumber),
			TrackType:   t.TrackType,
			Name:        pgTextToString(t.Name),
			CreatedAt:   pgTimestamptzToString(t.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(t.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListAudioTracksResponse{
		Tracks: pbTracks,
	}), nil
}

// CreateAudioTrack creates a new audio track
func (s *StoryboardService) CreateAudioTrack(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateAudioTrackRequest],
) (*connect.Response[storyboardv1.AudioTrack], error) {
	composerID, err := uuid.Parse(req.Msg.ComposerId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	t, err := s.queries.CreateAudioTrack(ctx, sqlc.CreateAudioTrackParams{
		ComposerID:  uuidToPgUUID(composerID),
		TrackNumber: int32(req.Msg.TrackNumber),
		TrackType:   req.Msg.TrackType,
		Name:        stringToPgText(req.Msg.Name),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.AudioTrack{
		Id:          pgUUIDToString(t.ID),
		ComposerId:  pgUUIDToString(t.ComposerID),
		TrackNumber: int32(t.TrackNumber),
		TrackType:   t.TrackType,
		Name:        pgTextToString(t.Name),
		CreatedAt:   pgTimestamptzToString(t.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(t.UpdatedAt),
	}), nil
}

// ListAudioClips lists audio clips for a track
func (s *StoryboardService) ListAudioClips(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListAudioClipsRequest],
) (*connect.Response[storyboardv1.ListAudioClipsResponse], error) {
	trackID, err := uuid.Parse(req.Msg.TrackId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	clips, err := s.queries.ListAudioClips(ctx, uuidToPgUUID(trackID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbClips := make([]*storyboardv1.AudioClip, 0, len(clips))
	for _, clip := range clips {
		pbClip := &storyboardv1.AudioClip{
			Id:               pgUUIDToString(clip.ID),
			TrackId:          pgUUIDToString(clip.TrackID),
			StartTimeSeconds: clip.StartTimeSeconds,
			DurationSeconds:  clip.DurationSeconds,
			AudioType:        clip.AudioType,
			AudioUrl:         pgTextToString(clip.AudioUrl),
			Metadata:         pgTextToString(clip.Metadata),
			CreatedAt:        pgTimestamptzToString(clip.CreatedAt),
			UpdatedAt:        pgTimestamptzToString(clip.UpdatedAt),
		}
		if clip.AudioDataID.Valid {
			pbClip.AudioDataId = stringPtr(pgUUIDToString(clip.AudioDataID))
		}
		pbClips = append(pbClips, pbClip)
	}

	return connect.NewResponse(&storyboardv1.ListAudioClipsResponse{
		Clips: pbClips,
	}), nil
}

// CreateAudioClip creates a new audio clip
func (s *StoryboardService) CreateAudioClip(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateAudioClipRequest],
) (*connect.Response[storyboardv1.AudioClip], error) {
	trackID, err := uuid.Parse(req.Msg.TrackId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	clip, err := s.queries.CreateAudioClip(ctx, sqlc.CreateAudioClipParams{
		TrackID:          uuidToPgUUID(trackID),
		StartTimeSeconds: req.Msg.StartTimeSeconds,
		DurationSeconds:  req.Msg.DurationSeconds,
		AudioType:        req.Msg.AudioType,
		AudioUrl:         stringToPgText(req.Msg.AudioUrl),
		Metadata:         stringToPgText(req.Msg.Metadata),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbClip := &storyboardv1.AudioClip{
		Id:               pgUUIDToString(clip.ID),
		TrackId:          pgUUIDToString(clip.TrackID),
		StartTimeSeconds: clip.StartTimeSeconds,
		DurationSeconds:  clip.DurationSeconds,
		AudioType:        clip.AudioType,
		AudioUrl:         pgTextToString(clip.AudioUrl),
		Metadata:         pgTextToString(clip.Metadata),
		CreatedAt:        pgTimestamptzToString(clip.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(clip.UpdatedAt),
	}
	if clip.AudioDataID.Valid {
		pbClip.AudioDataId = stringPtr(pgUUIDToString(clip.AudioDataID))
	}

	return connect.NewResponse(pbClip), nil
}

// ListSunoMusic lists Suno music for a composer
func (s *StoryboardService) ListSunoMusic(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListSunoMusicRequest],
) (*connect.Response[storyboardv1.ListSunoMusicResponse], error) {
	composerID, err := uuid.Parse(req.Msg.ComposerId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	music, err := s.queries.ListSunoMusic(ctx, uuidToPgUUID(composerID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbMusic := make([]*storyboardv1.SunoMusic, 0, len(music))
	for _, m := range music {
		pbM := &storyboardv1.SunoMusic{
			Id:        pgUUIDToString(m.ID),
			Prompt:    m.Prompt,
			Status:    m.Status,
			AudioUrl:  pgTextToString(m.AudioUrl),
			TaskId:    pgTextToString(m.TaskID),
			CreatedAt: pgTimestamptzToString(m.CreatedAt),
			UpdatedAt: pgTimestamptzToString(m.UpdatedAt),
		}
		if m.ComposerID.Valid {
			pbM.ComposerId = stringPtr(pgUUIDToString(m.ComposerID))
		}
		if m.AudioDataID.Valid {
			pbM.AudioDataId = stringPtr(pgUUIDToString(m.AudioDataID))
		}
		pbMusic = append(pbMusic, pbM)
	}

	return connect.NewResponse(&storyboardv1.ListSunoMusicResponse{
		Music: pbMusic,
	}), nil
}

// GenerateSunoMusic generates music using Suno AI via Temporal workflow
func (s *StoryboardService) GenerateSunoMusic(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateSunoMusicRequest],
) (*connect.Response[storyboardv1.GenerateSunoMusicResponse], error) {
	var composerID *uuid.UUID
	if req.Msg.ComposerId != nil {
		id, err := uuid.Parse(*req.Msg.ComposerId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		composerID = &id
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Prepare parameters for Suno
	params := map[string]interface{}{
		"prompt": req.Msg.Prompt,
	}
	if composerID != nil {
		params["composerId"] = composerID.String()
	}

	// Start Temporal workflow for Suno music generation
	// Use a dummy storyboard ID since Suno doesn't require storyboard
	dummyStoryboardID := uuid.New().String()
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("suno-music-%s-%s", dummyStoryboardID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.VideoGenerationWorkflow, workflows.VideoGenerationWorkflowInput{
		StoryboardID: dummyStoryboardID,
		Provider:     "suno",
		Params:       params,
		OrgID:        orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.VideoGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Save to SunoMusic table
	var composerIDPg pgtype.UUID
	if composerID != nil {
		composerIDPg = uuidToPgUUID(*composerID)
	}
	music, err := s.queries.CreateSunoMusic(ctx, sqlc.CreateSunoMusicParams{
		ComposerID: composerIDPg,
		Prompt:     req.Msg.Prompt,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update with task ID and audio URL
	taskIDPg := stringToPgText(&result.ProviderID)
	audioURL := stringToPgText(&result.VideoURL)
	updatedMusic, err := s.queries.UpdateSunoMusicStatus(ctx, sqlc.UpdateSunoMusicStatusParams{
		ID:       music.ID,
		Status:   result.Status,
		AudioUrl: audioURL,
		TaskID:   taskIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbM := &storyboardv1.SunoMusic{
		Id:        pgUUIDToString(updatedMusic.ID),
		Prompt:    updatedMusic.Prompt,
		Status:    updatedMusic.Status,
		AudioUrl:  pgTextToString(updatedMusic.AudioUrl),
		TaskId:    pgTextToString(updatedMusic.TaskID),
		CreatedAt: pgTimestamptzToString(updatedMusic.CreatedAt),
		UpdatedAt: pgTimestamptzToString(updatedMusic.UpdatedAt),
	}
	if updatedMusic.ComposerID.Valid {
		pbM.ComposerId = stringPtr(pgUUIDToString(updatedMusic.ComposerID))
	}
	if updatedMusic.AudioDataID.Valid {
		pbM.AudioDataId = stringPtr(pgUUIDToString(updatedMusic.AudioDataID))
	}

	return connect.NewResponse(&storyboardv1.GenerateSunoMusicResponse{
		Music: pbM,
	}), nil
}
