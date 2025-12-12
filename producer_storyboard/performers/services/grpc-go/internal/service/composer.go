package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"connectrpc.com/connect"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
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

	composers, err := s.queries.ListComposers(ctx, projectID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbComposers := make([]*storyboardv1.Composer, 0, len(composers))
	for _, c := range composers {
		pbComposers = append(pbComposers, &storyboardv1.Composer{
			Id:              c.ID.String(),
			ProjectId:       c.ProjectID.String(),
			Title:           c.Title,
			DurationSeconds: c.DurationSeconds,
			CreatedAt:       c.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       c.UpdatedAt.Format(time.RFC3339),
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

	c, err := s.queries.GetComposer(ctx, composerID)
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              c.ID.String(),
		ProjectId:       c.ProjectID.String(),
		Title:           c.Title,
		DurationSeconds: c.DurationSeconds,
		CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       c.UpdatedAt.Format(time.RFC3339),
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
		ProjectID:       projectID,
		Title:           req.Msg.Title,
		DurationSeconds: req.Msg.DurationSeconds,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              c.ID.String(),
		ProjectId:       c.ProjectID.String(),
		Title:           c.Title,
		DurationSeconds: c.DurationSeconds,
		CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       c.UpdatedAt.Format(time.RFC3339),
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

	c, err := s.queries.UpdateComposer(ctx, sqlc.UpdateComposerParams{
		ID:              composerID,
		Title:           req.Msg.Title,
		DurationSeconds: req.Msg.DurationSeconds,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Composer{
		Id:              c.ID.String(),
		ProjectId:       c.ProjectID.String(),
		Title:           c.Title,
		DurationSeconds: c.DurationSeconds,
		CreatedAt:       c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       c.UpdatedAt.Format(time.RFC3339),
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

	err = s.queries.DeleteComposer(ctx, composerID)
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

	tracks, err := s.queries.ListAudioTracks(ctx, composerID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbTracks := make([]*storyboardv1.AudioTrack, 0, len(tracks))
	for _, t := range tracks {
		pbTracks = append(pbTracks, &storyboardv1.AudioTrack{
			Id:          t.ID.String(),
			ComposerId:  t.ComposerID.String(),
			TrackNumber: int32(t.TrackNumber),
			TrackType:   t.TrackType,
			Name:        t.Name,
			CreatedAt:   t.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
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
		ComposerID:  composerID,
		TrackNumber: int32(req.Msg.TrackNumber),
		TrackType:   req.Msg.TrackType,
		Name:        req.Msg.Name,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.AudioTrack{
		Id:          t.ID.String(),
		ComposerId:  t.ComposerID.String(),
		TrackNumber: int32(t.TrackNumber),
		TrackType:   t.TrackType,
		Name:        t.Name,
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
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

	clips, err := s.queries.ListAudioClips(ctx, trackID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbClips := make([]*storyboardv1.AudioClip, 0, len(clips))
	for _, clip := range clips {
		pbClip := &storyboardv1.AudioClip{
			Id:               clip.ID.String(),
			TrackId:          clip.TrackID.String(),
			StartTimeSeconds: clip.StartTimeSeconds,
			DurationSeconds:  clip.DurationSeconds,
			AudioType:        clip.AudioType,
			AudioUrl:         clip.AudioUrl,
			Metadata:         clip.Metadata,
			CreatedAt:        clip.CreatedAt.Format(time.RFC3339),
			UpdatedAt:        clip.UpdatedAt.Format(time.RFC3339),
		}
		if clip.AudioDataID != nil {
			pbClip.AudioDataId = stringPtr(clip.AudioDataID.String())
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
		TrackID:          trackID,
		StartTimeSeconds: req.Msg.StartTimeSeconds,
		DurationSeconds:  req.Msg.DurationSeconds,
		AudioType:        req.Msg.AudioType,
		AudioUrl:         req.Msg.AudioUrl,
		Metadata:         req.Msg.Metadata,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbClip := &storyboardv1.AudioClip{
		Id:               clip.ID.String(),
		TrackId:          clip.TrackID.String(),
		StartTimeSeconds: clip.StartTimeSeconds,
		DurationSeconds:  clip.DurationSeconds,
		AudioType:        clip.AudioType,
		AudioUrl:         clip.AudioUrl,
		Metadata:         clip.Metadata,
		CreatedAt:        clip.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        clip.UpdatedAt.Format(time.RFC3339),
	}
	if clip.AudioDataID != nil {
		pbClip.AudioDataId = stringPtr(clip.AudioDataID.String())
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

	music, err := s.queries.ListSunoMusic(ctx, composerID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbMusic := make([]*storyboardv1.SunoMusic, 0, len(music))
	for _, m := range music {
		pbM := &storyboardv1.SunoMusic{
			Id:        m.ID.String(),
			Prompt:    m.Prompt,
			Status:    m.Status,
			AudioUrl:  m.AudioUrl,
			TaskId:    m.TaskID,
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
			UpdatedAt: m.UpdatedAt.Format(time.RFC3339),
		}
		if m.ComposerID != nil {
			pbM.ComposerId = stringPtr(m.ComposerID.String())
		}
		if m.AudioDataID != nil {
			pbM.AudioDataId = stringPtr(m.AudioDataID.String())
		}
		pbMusic = append(pbMusic, pbM)
	}

	return connect.NewResponse(&storyboardv1.ListSunoMusicResponse{
		Music: pbMusic,
	}), nil
}

// GenerateSunoMusic generates music using Suno AI
func (s *StoryboardService) GenerateSunoMusic(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateSunoMusicRequest],
) (*connect.Response[storyboardv1.GenerateSunoMusicResponse], error) {
	if s.suno == nil {
		return nil, connect.NewError(connect.CodeUnimplemented, nil)
	}

	var composerID *uuid.UUID
	if req.Msg.ComposerId != nil {
		id, err := uuid.Parse(*req.Msg.ComposerId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		composerID = &id
	}

	// Generate music using Suno service
	result, err := s.suno.GenerateMusic(ctx, req.Msg.Prompt)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Save to database
	music, err := s.queries.CreateSunoMusic(ctx, sqlc.CreateSunoMusicParams{
		ComposerID: composerID,
		Prompt:     req.Msg.Prompt,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update with task ID
	updatedMusic, err := s.queries.UpdateSunoMusicStatus(ctx, sqlc.UpdateSunoMusicStatusParams{
		ID:      music.ID,
		Status:  result.Status,
		AudioUrl: result.AudioURL,
		TaskID:  &result.TaskID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbM := &storyboardv1.SunoMusic{
		Id:        updatedMusic.ID.String(),
		Prompt:    updatedMusic.Prompt,
		Status:    updatedMusic.Status,
		AudioUrl:  updatedMusic.AudioUrl,
		TaskId:    updatedMusic.TaskID,
		CreatedAt: updatedMusic.CreatedAt.Format(time.RFC3339),
		UpdatedAt: updatedMusic.UpdatedAt.Format(time.RFC3339),
	}
	if updatedMusic.ComposerID != nil {
		pbM.ComposerId = stringPtr(updatedMusic.ComposerID.String())
	}
	if updatedMusic.AudioDataID != nil {
		pbM.AudioDataId = stringPtr(updatedMusic.AudioDataID.String())
	}

	return connect.NewResponse(&storyboardv1.GenerateSunoMusicResponse{
		Music: pbM,
	}), nil
}
