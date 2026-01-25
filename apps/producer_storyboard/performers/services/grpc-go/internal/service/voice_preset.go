package service

import (
	"context"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListVoicePresets lists voice presets for a project
func (s *StoryboardService) ListVoicePresets(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListVoicePresetsRequest],
) (*connect.Response[storyboardv1.ListVoicePresetsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	var characterIDPg pgtype.UUID
	if req.Msg.CharacterId != nil && *req.Msg.CharacterId != "" {
		characterID, err := uuid.Parse(*req.Msg.CharacterId)
		if err == nil {
			characterIDPg = uuidToPgUUID(characterID)
		}
	}

	presets, err := s.queries.ListVoicePresets(ctx, sqlc.ListVoicePresetsParams{
		ProjectID: uuidToPgUUID(projectID),
		OrgID:     orgIDPg,
		Column3:   characterIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbPresets := make([]*storyboardv1.VoicePreset, 0, len(presets))
	for _, preset := range presets {
		var settingsStr *string
		if preset.Settings != nil && len(preset.Settings) > 0 {
			settingsStr = stringPtr(string(preset.Settings))
		}

		var characterIDStr *string
		if preset.CharacterID.Valid {
			characterIDStrVal := pgUUIDToString(preset.CharacterID)
			characterIDStr = &characterIDStrVal
		}

		var sampleAudioIDStr *string
		if preset.SampleAudioID.Valid {
			sampleAudioIDStrVal := pgUUIDToString(preset.SampleAudioID)
			sampleAudioIDStr = &sampleAudioIDStrVal
		}

		pbPreset := &storyboardv1.VoicePreset{
			Id:            pgUUIDToString(preset.ID),
			ProjectId:     pgUUIDToString(preset.ProjectID),
			Name:          preset.Name,
			HumeVoiceId:   preset.HumeVoiceID,
			Description:   pgTextToString(preset.Description),
			CharacterId:   characterIDStr,
			SampleAudioId: sampleAudioIDStr,
			Settings:      settingsStr,
			CreatedAt:     pgTimestamptzToString(preset.CreatedAt),
			UpdatedAt:     pgTimestamptzToString(preset.UpdatedAt),
		}
		pbPresets = append(pbPresets, pbPreset)
	}

	return connect.NewResponse(&storyboardv1.ListVoicePresetsResponse{
		Presets: pbPresets,
	}), nil
}

// GetVoicePreset retrieves a voice preset by ID
func (s *StoryboardService) GetVoicePreset(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetVoicePresetRequest],
) (*connect.Response[storyboardv1.VoicePreset], error) {
	presetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	preset, err := s.queries.GetVoicePreset(ctx, sqlc.GetVoicePresetParams{
		ID:    uuidToPgUUID(presetID),
		OrgID: orgIDPg,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var settingsStr *string
	if preset.Settings != nil && len(preset.Settings) > 0 {
		settingsStr = stringPtr(string(preset.Settings))
	}

	var characterIDStr *string
	if preset.CharacterID.Valid {
		characterIDStrVal := pgUUIDToString(preset.CharacterID)
		characterIDStr = &characterIDStrVal
	}

	var sampleAudioIDStr *string
	if preset.SampleAudioID.Valid {
		sampleAudioIDStrVal := pgUUIDToString(preset.SampleAudioID)
		sampleAudioIDStr = &sampleAudioIDStrVal
	}

	return connect.NewResponse(&storyboardv1.VoicePreset{
		Id:            pgUUIDToString(preset.ID),
		ProjectId:     pgUUIDToString(preset.ProjectID),
		Name:          preset.Name,
		HumeVoiceId:   preset.HumeVoiceID,
		Description:   pgTextToString(preset.Description),
		CharacterId:   characterIDStr,
		SampleAudioId: sampleAudioIDStr,
		Settings:      settingsStr,
		CreatedAt:     pgTimestamptzToString(preset.CreatedAt),
		UpdatedAt:     pgTimestamptzToString(preset.UpdatedAt),
	}), nil
}

// CreateVoicePreset creates a new voice preset
func (s *StoryboardService) CreateVoicePreset(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateVoicePresetRequest],
) (*connect.Response[storyboardv1.VoicePreset], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	var characterIDPg pgtype.UUID
	if req.Msg.CharacterId != nil && *req.Msg.CharacterId != "" {
		characterID, err := uuid.Parse(*req.Msg.CharacterId)
		if err == nil {
			characterIDPg = uuidToPgUUID(characterID)
		}
	}

	var sampleAudioIDPg pgtype.UUID
	if req.Msg.SampleAudioId != nil && *req.Msg.SampleAudioId != "" {
		audioID, err := uuid.Parse(*req.Msg.SampleAudioId)
		if err == nil {
			sampleAudioIDPg = uuidToPgUUID(audioID)
		}
	}

	// Parse settings JSON if provided
	var settingsBytes []byte
	if req.Msg.Settings != nil && *req.Msg.Settings != "" {
		settingsBytes = []byte(*req.Msg.Settings)
	}

	preset, err := s.queries.CreateVoicePreset(ctx, sqlc.CreateVoicePresetParams{
		ProjectID:     uuidToPgUUID(projectID),
		OrgID:         orgIDPg,
		Name:          req.Msg.Name,
		HumeVoiceID:   req.Msg.HumeVoiceId,
		Description:   stringToPgText(req.Msg.Description),
		CharacterID:   characterIDPg,
		SampleAudioID: sampleAudioIDPg,
		Settings:      settingsBytes,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var settingsStr *string
	if preset.Settings != nil && len(preset.Settings) > 0 {
		settingsStr = stringPtr(string(preset.Settings))
	}

	var characterIDStr *string
	if preset.CharacterID.Valid {
		characterIDStrVal := pgUUIDToString(preset.CharacterID)
		characterIDStr = &characterIDStrVal
	}

	var sampleAudioIDStr *string
	if preset.SampleAudioID.Valid {
		sampleAudioIDStrVal := pgUUIDToString(preset.SampleAudioID)
		sampleAudioIDStr = &sampleAudioIDStrVal
	}

	return connect.NewResponse(&storyboardv1.VoicePreset{
		Id:            pgUUIDToString(preset.ID),
		ProjectId:     pgUUIDToString(preset.ProjectID),
		Name:          preset.Name,
		HumeVoiceId:   preset.HumeVoiceID,
		Description:   pgTextToString(preset.Description),
		CharacterId:   characterIDStr,
		SampleAudioId: sampleAudioIDStr,
		Settings:      settingsStr,
		CreatedAt:     pgTimestamptzToString(preset.CreatedAt),
		UpdatedAt:     pgTimestamptzToString(preset.UpdatedAt),
	}), nil
}

// UpdateVoicePreset updates an existing voice preset
func (s *StoryboardService) UpdateVoicePreset(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateVoicePresetRequest],
) (*connect.Response[storyboardv1.VoicePreset], error) {
	presetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	name := ""
	if req.Msg.Name != nil {
		name = *req.Msg.Name
	}

	humeVoiceID := ""
	if req.Msg.HumeVoiceId != nil {
		humeVoiceID = *req.Msg.HumeVoiceId
	}

	var characterIDPg pgtype.UUID
	if req.Msg.CharacterId != nil && *req.Msg.CharacterId != "" {
		characterID, err := uuid.Parse(*req.Msg.CharacterId)
		if err == nil {
			characterIDPg = uuidToPgUUID(characterID)
		}
	}

	var sampleAudioIDPg pgtype.UUID
	if req.Msg.SampleAudioId != nil && *req.Msg.SampleAudioId != "" {
		audioID, err := uuid.Parse(*req.Msg.SampleAudioId)
		if err == nil {
			sampleAudioIDPg = uuidToPgUUID(audioID)
		}
	}

	// Parse settings JSON if provided
	var settingsBytes []byte
	if req.Msg.Settings != nil && *req.Msg.Settings != "" {
		settingsBytes = []byte(*req.Msg.Settings)
	}

	preset, err := s.queries.UpdateVoicePreset(ctx, sqlc.UpdateVoicePresetParams{
		ID:            uuidToPgUUID(presetID),
		OrgID:         orgIDPg,
		Name:          name,
		HumeVoiceID:   humeVoiceID,
		Description:   stringToPgText(req.Msg.Description),
		CharacterID:   characterIDPg,
		SampleAudioID: sampleAudioIDPg,
		Settings:      settingsBytes,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var settingsStr *string
	if preset.Settings != nil && len(preset.Settings) > 0 {
		settingsStr = stringPtr(string(preset.Settings))
	}

	var characterIDStr *string
	if preset.CharacterID.Valid {
		characterIDStrVal := pgUUIDToString(preset.CharacterID)
		characterIDStr = &characterIDStrVal
	}

	var sampleAudioIDStr *string
	if preset.SampleAudioID.Valid {
		sampleAudioIDStrVal := pgUUIDToString(preset.SampleAudioID)
		sampleAudioIDStr = &sampleAudioIDStrVal
	}

	return connect.NewResponse(&storyboardv1.VoicePreset{
		Id:            pgUUIDToString(preset.ID),
		ProjectId:     pgUUIDToString(preset.ProjectID),
		Name:          preset.Name,
		HumeVoiceId:   preset.HumeVoiceID,
		Description:   pgTextToString(preset.Description),
		CharacterId:   characterIDStr,
		SampleAudioId: sampleAudioIDStr,
		Settings:      settingsStr,
		CreatedAt:     pgTimestamptzToString(preset.CreatedAt),
		UpdatedAt:     pgTimestamptzToString(preset.UpdatedAt),
	}), nil
}

// DeleteVoicePreset deletes a voice preset
func (s *StoryboardService) DeleteVoicePreset(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteVoicePresetRequest],
) (*connect.Response[storyboardv1.DeleteVoicePresetResponse], error) {
	presetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.DeleteVoicePreset(ctx, sqlc.DeleteVoicePresetParams{
		ID:    uuidToPgUUID(presetID),
		OrgID: orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteVoicePresetResponse{
		Success: true,
	}), nil
}
