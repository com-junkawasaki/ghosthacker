package service

import (
	"context"
	"encoding/json"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListWorldSettings lists world settings for a project
func (s *StoryboardService) ListWorldSettings(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListWorldSettingsRequest],
) (*connect.Response[storyboardv1.ListWorldSettingsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	settings, err := s.queries.ListWorldSettings(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbSettings := make([]*storyboardv1.WorldSetting, 0, len(settings))
	for _, setting := range settings {
		pbSettings = append(pbSettings, worldSettingToPB(setting))
	}

	return connect.NewResponse(&storyboardv1.ListWorldSettingsResponse{
		WorldSettings: pbSettings,
	}), nil
}

// GetWorldSetting retrieves a world setting by ID
func (s *StoryboardService) GetWorldSetting(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetWorldSettingRequest],
) (*connect.Response[storyboardv1.WorldSetting], error) {
	settingID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	setting, err := s.queries.GetWorldSetting(ctx, uuidToPgUUID(settingID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(worldSettingToPB(setting)), nil
}

// CreateWorldSetting creates a new world setting
func (s *StoryboardService) CreateWorldSetting(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateWorldSettingRequest],
) (*connect.Response[storyboardv1.WorldSetting], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	var attributesJSON json.RawMessage
	if req.Msg.AttributesJson != nil {
		attributesJSON = json.RawMessage(*req.Msg.AttributesJson)
	}

	setting, err := s.queries.CreateWorldSetting(ctx, sqlc.CreateWorldSettingParams{
		ProjectID:      uuidToPgUUID(projectID),
		OrgID:          stringToPgText(&orgID),
		Name:           req.Msg.Name,
		Description:    stringToPgText(req.Msg.Description),
		SettingType:    stringToPgText(req.Msg.SettingType),
		TimePeriod:     stringToPgText(req.Msg.TimePeriod),
		Geography:      stringToPgText(req.Msg.Geography),
		Climate:        stringToPgText(req.Msg.Climate),
		Culture:        stringToPgText(req.Msg.Culture),
		Politics:       stringToPgText(req.Msg.Politics),
		Economy:        stringToPgText(req.Msg.Economy),
		MagicSystem:    stringToPgText(req.Msg.MagicSystem),
		Rules:          stringToPgText(req.Msg.Rules),
		History:        stringToPgText(req.Msg.History),
		AttributesJson: attributesJSON,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(worldSettingToPB(setting)), nil
}

// UpdateWorldSetting updates an existing world setting
func (s *StoryboardService) UpdateWorldSetting(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateWorldSettingRequest],
) (*connect.Response[storyboardv1.WorldSetting], error) {
	settingID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var name string
	if req.Msg.Name != nil {
		name = *req.Msg.Name
	}

	var attributesJSON json.RawMessage
	if req.Msg.AttributesJson != nil {
		attributesJSON = json.RawMessage(*req.Msg.AttributesJson)
	}

	setting, err := s.queries.UpdateWorldSetting(ctx, sqlc.UpdateWorldSettingParams{
		ID:             uuidToPgUUID(settingID),
		Name:           name,
		Description:    stringToPgText(req.Msg.Description),
		SettingType:    stringToPgText(req.Msg.SettingType),
		TimePeriod:     stringToPgText(req.Msg.TimePeriod),
		Geography:      stringToPgText(req.Msg.Geography),
		Climate:        stringToPgText(req.Msg.Climate),
		Culture:        stringToPgText(req.Msg.Culture),
		Politics:       stringToPgText(req.Msg.Politics),
		Economy:        stringToPgText(req.Msg.Economy),
		MagicSystem:    stringToPgText(req.Msg.MagicSystem),
		Rules:          stringToPgText(req.Msg.Rules),
		History:        stringToPgText(req.Msg.History),
		AttributesJson: attributesJSON,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(worldSettingToPB(setting)), nil
}

// DeleteWorldSetting deletes a world setting
func (s *StoryboardService) DeleteWorldSetting(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteWorldSettingRequest],
) (*connect.Response[storyboardv1.DeleteWorldSettingResponse], error) {
	settingID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteWorldSetting(ctx, uuidToPgUUID(settingID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteWorldSettingResponse{
		Success: true,
	}), nil
}

// Helper function to convert sqlc.WorldSetting to storyboardv1.WorldSetting
func worldSettingToPB(setting sqlc.WorldSetting) *storyboardv1.WorldSetting {
	pbSetting := &storyboardv1.WorldSetting{
		Id:          pgUUIDToString(setting.ID),
		ProjectId:   pgUUIDToString(setting.ProjectID),
		Name:        setting.Name,
		Description: pgTextToString(setting.Description),
		SettingType: pgTextToString(setting.SettingType),
		TimePeriod:  pgTextToString(setting.TimePeriod),
		Geography:   pgTextToString(setting.Geography),
		Climate:     pgTextToString(setting.Climate),
		Culture:     pgTextToString(setting.Culture),
		Politics:    pgTextToString(setting.Politics),
		Economy:     pgTextToString(setting.Economy),
		MagicSystem: pgTextToString(setting.MagicSystem),
		Rules:       pgTextToString(setting.Rules),
		History:     pgTextToString(setting.History),
		CreatedAt:   pgTimestamptzToString(setting.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(setting.UpdatedAt),
	}

	if setting.OrgID.Valid {
		pbSetting.OrgId = stringPtr(setting.OrgID.String)
	}

	if len(setting.AttributesJson) > 0 {
		attrStr := string(setting.AttributesJson)
		pbSetting.AttributesJson = &attrStr
	}

	return pbSetting
}
