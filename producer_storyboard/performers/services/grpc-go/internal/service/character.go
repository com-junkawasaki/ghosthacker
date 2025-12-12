package service

import (
	"context"
	"encoding/base64"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListCharacters lists characters for a project
func (s *StoryboardService) ListCharacters(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListCharactersRequest],
) (*connect.Response[storyboardv1.ListCharactersResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	characters, err := s.queries.ListCharacters(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbCharacters := make([]*storyboardv1.Character, 0, len(characters))
	for _, char := range characters {
		pbChar := &storyboardv1.Character{
			Id:                 pgUUIDToString(char.ID),
			ProjectId:          pgUUIDToString(char.ProjectID),
			Name:               char.Name,
			Description:        pgTextToString(char.Description),
			Personality:        pgTextToString(char.Personality),
			Background:         pgTextToString(char.Background),
			DefaultHumeVoiceId: pgTextToString(char.DefaultHumeVoiceID),
			CreatedAt:          pgTimestamptzToString(char.CreatedAt),
			UpdatedAt:          pgTimestamptzToString(char.UpdatedAt),
		}
		if char.ProfileImageID.Valid {
			pbChar.ProfileImageId = stringPtr(pgUUIDToString(char.ProfileImageID))
		}
		pbCharacters = append(pbCharacters, pbChar)
	}

	return connect.NewResponse(&storyboardv1.ListCharactersResponse{
		Characters: pbCharacters,
	}), nil
}

// GetCharacter retrieves a character by ID
func (s *StoryboardService) GetCharacter(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacterRequest],
) (*connect.Response[storyboardv1.Character], error) {
	characterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	char, err := s.queries.GetCharacter(ctx, uuidToPgUUID(characterID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbChar := &storyboardv1.Character{
		Id:                 pgUUIDToString(char.ID),
		ProjectId:          pgUUIDToString(char.ProjectID),
		Name:               char.Name,
		Description:        pgTextToString(char.Description),
		Personality:        pgTextToString(char.Personality),
		Background:         pgTextToString(char.Background),
		DefaultHumeVoiceId: pgTextToString(char.DefaultHumeVoiceID),
		CreatedAt:          pgTimestamptzToString(char.CreatedAt),
		UpdatedAt:          pgTimestamptzToString(char.UpdatedAt),
	}
	if char.ProfileImageID.Valid {
		pbChar.ProfileImageId = stringPtr(pgUUIDToString(char.ProfileImageID))
	}

	return connect.NewResponse(pbChar), nil
}

// CreateCharacter creates a new character
func (s *StoryboardService) CreateCharacter(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateCharacterRequest],
) (*connect.Response[storyboardv1.Character], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	var orgIDPtr *string
	if orgID != "" {
		orgIDPtr = &orgID
	}

	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	char, err := s.queries.CreateCharacter(ctx, sqlc.CreateCharacterParams{
		ProjectID:          uuidToPgUUID(projectID),
		Name:               req.Msg.Name,
		Description:        stringToPgText(req.Msg.Description),
		Personality:        stringToPgText(req.Msg.Personality),
		Background:         stringToPgText(req.Msg.Background),
		DefaultHumeVoiceID: stringToPgText(req.Msg.DefaultHumeVoiceId),
		OrgID:              orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbChar := &storyboardv1.Character{
		Id:                 pgUUIDToString(char.ID),
		ProjectId:          pgUUIDToString(char.ProjectID),
		Name:               char.Name,
		Description:        pgTextToString(char.Description),
		Personality:        pgTextToString(char.Personality),
		Background:         pgTextToString(char.Background),
		DefaultHumeVoiceId: pgTextToString(char.DefaultHumeVoiceID),
		CreatedAt:          pgTimestamptzToString(char.CreatedAt),
		UpdatedAt:          pgTimestamptzToString(char.UpdatedAt),
	}
	if char.ProfileImageID.Valid {
		pbChar.ProfileImageId = stringPtr(pgUUIDToString(char.ProfileImageID))
	}

	return connect.NewResponse(pbChar), nil
}

// UpdateCharacter updates an existing character
func (s *StoryboardService) UpdateCharacter(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateCharacterRequest],
) (*connect.Response[storyboardv1.Character], error) {
	characterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	char, err := s.queries.UpdateCharacter(ctx, sqlc.UpdateCharacterParams{
		ID:                 uuidToPgUUID(characterID),
		Name:               req.Msg.Name,
		Description:        stringToPgText(req.Msg.Description),
		Personality:        stringToPgText(req.Msg.Personality),
		Background:         stringToPgText(req.Msg.Background),
		DefaultHumeVoiceID: stringToPgText(req.Msg.DefaultHumeVoiceId),
		ProfileImageID:     pgtype.UUID{Valid: false}, // Not in UpdateCharacterRequest
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbChar := &storyboardv1.Character{
		Id:                 pgUUIDToString(char.ID),
		ProjectId:          pgUUIDToString(char.ProjectID),
		Name:               char.Name,
		Description:        pgTextToString(char.Description),
		Personality:        pgTextToString(char.Personality),
		Background:         pgTextToString(char.Background),
		DefaultHumeVoiceId: pgTextToString(char.DefaultHumeVoiceID),
		CreatedAt:          pgTimestamptzToString(char.CreatedAt),
		UpdatedAt:          pgTimestamptzToString(char.UpdatedAt),
	}
	if char.ProfileImageID.Valid {
		pbChar.ProfileImageId = stringPtr(pgUUIDToString(char.ProfileImageID))
	}

	return connect.NewResponse(pbChar), nil
}

// DeleteCharacter deletes a character
func (s *StoryboardService) DeleteCharacter(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteCharacterRequest],
) (*connect.Response[storyboardv1.DeleteCharacterResponse], error) {
	characterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteCharacter(ctx, uuidToPgUUID(characterID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteCharacterResponse{
		Success: true,
	}), nil
}

// ListCharacterAssets lists assets for a character
func (s *StoryboardService) ListCharacterAssets(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListCharacterAssetsRequest],
) (*connect.Response[storyboardv1.ListCharacterAssetsResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	assets, err := s.queries.ListCharacterAssets(ctx, uuidToPgUUID(characterID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbAssets := make([]*storyboardv1.CharacterAsset, 0, len(assets))
	for _, asset := range assets {
		pbAssets = append(pbAssets, &storyboardv1.CharacterAsset{
			Id:          pgUUIDToString(asset.ID),
			CharacterId: pgUUIDToString(asset.CharacterID),
			AssetType:   asset.AssetType,
			AssetFormat: pgTextToString(asset.AssetFormat),
			CreatedAt:   pgTimestamptzToString(asset.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(asset.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListCharacterAssetsResponse{
		Assets: pbAssets,
	}), nil
}

// GetCharacterAssetData retrieves character asset data as base64
func (s *StoryboardService) GetCharacterAssetData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacterAssetDataRequest],
) (*connect.Response[storyboardv1.GetCharacterAssetDataResponse], error) {
	assetID, err := uuid.Parse(req.Msg.AssetId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetCharacterAssetData(ctx, uuidToPgUUID(assetID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.AssetData)

	return connect.NewResponse(&storyboardv1.GetCharacterAssetDataResponse{
		AssetDataBase64: base64Data,
	}), nil
}

// ListHumeVoices lists available Hume AI voices
func (s *StoryboardService) ListHumeVoices(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListHumeVoicesRequest],
) (*connect.Response[storyboardv1.ListHumeVoicesResponse], error) {
	if s.hume == nil {
		return connect.NewResponse(&storyboardv1.ListHumeVoicesResponse{
			Voices: []*storyboardv1.HumeVoice{},
		}), nil
	}

	voices, err := s.hume.ListVoices(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbVoices := make([]*storyboardv1.HumeVoice, 0, len(voices))
	for _, voice := range voices {
		pbVoices = append(pbVoices, &storyboardv1.HumeVoice{
			Id:          voice.ID,
			Name:        voice.Name,
			Description: voice.Description,
			Language:    voice.Language,
		})
	}

	return connect.NewResponse(&storyboardv1.ListHumeVoicesResponse{
		Voices: pbVoices,
	}), nil
}
