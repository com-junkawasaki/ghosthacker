package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"time"

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
		pbChar := characterRowToPB(char)
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

	return connect.NewResponse(characterGetRowToPB(char)), nil
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

	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	// CreateCharacterRequest only has basic fields, extended fields are only in UpdateCharacterRequest
	char, err := s.queries.CreateCharacter(ctx, sqlc.CreateCharacterParams{
		ProjectID:          uuidToPgUUID(projectID),
		Name:               req.Msg.Name,
		Description:        stringToPgText(req.Msg.Description),
		Personality:        stringToPgText(req.Msg.Personality),
		Background:         stringToPgText(req.Msg.Background),
		DefaultHumeVoiceID: stringToPgText(req.Msg.DefaultHumeVoiceId),
		OrgID:              orgIDPg,
		Age:                pgtype.Int4{Valid: false}, // Not in CreateCharacterRequest
		Gender:             pgtype.Text{Valid: false},
		BirthDate:          pgtype.Date{Valid: false},
		HeightCm:           pgtype.Int4{Valid: false},
		WeightKg:           pgtype.Numeric{Valid: false},
		HairColor:          pgtype.Text{Valid: false},
		EyeColor:           pgtype.Text{Valid: false},
		OccupationID:       pgtype.UUID{Valid: false},
		OrganizationID:     pgtype.UUID{Valid: false},
		AttributesJson:     nil,
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

	name := ""
	if req.Msg.Name != nil {
		name = *req.Msg.Name
	}

	var attributesJSON json.RawMessage
	if req.Msg.AttributesJson != nil {
		attributesJSON = json.RawMessage(*req.Msg.AttributesJson)
	}

	var occupationID *uuid.UUID
	if req.Msg.OccupationId != nil {
		occID, err := uuid.Parse(*req.Msg.OccupationId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		occupationID = &occID
	}

	var organizationID *uuid.UUID
	if req.Msg.OrganizationId != nil {
		orgID, err := uuid.Parse(*req.Msg.OrganizationId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		organizationID = &orgID
	}

	var birthDate *time.Time
	if req.Msg.BirthDate != nil {
		birth, err := time.Parse(time.RFC3339, *req.Msg.BirthDate)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		birthDate = &birth
	}

	char, err := s.queries.UpdateCharacter(ctx, sqlc.UpdateCharacterParams{
		ID:                 uuidToPgUUID(characterID),
		Name:               name,
		Description:        stringToPgText(req.Msg.Description),
		Personality:        stringToPgText(req.Msg.Personality),
		Background:         stringToPgText(req.Msg.Background),
		DefaultHumeVoiceID: stringToPgText(req.Msg.DefaultHumeVoiceId),
		ProfileImageID:     pgtype.UUID{Valid: false}, // Not in UpdateCharacterRequest
		Age:                int32ToPgInt4(req.Msg.Age),
		Gender:             stringToPgText(req.Msg.Gender),
		BirthDate:          dateToPgDate(birthDate),
		HeightCm:           int32ToPgInt4(req.Msg.HeightCm),
		WeightKg:           float64ToPgNumeric(req.Msg.WeightKg),
		HairColor:          stringToPgText(req.Msg.HairColor),
		EyeColor:           stringToPgText(req.Msg.EyeColor),
		OccupationID:       uuidToPgUUIDPtr(occupationID),
		OrganizationID:     uuidToPgUUIDPtr(organizationID),
		AttributesJson:     attributesJSON,
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

// ListCharacterImages lists images for a character
func (s *StoryboardService) ListCharacterImages(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListCharacterImagesRequest],
) (*connect.Response[storyboardv1.ListCharacterImagesResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	images, err := s.queries.ListCharacterImages(ctx, uuidToPgUUID(characterID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbImages := make([]*storyboardv1.CharacterImage, 0, len(images))
	for _, img := range images {
		pbImages = append(pbImages, &storyboardv1.CharacterImage{
			Id:          pgUUIDToString(img.ID),
			CharacterId: pgUUIDToString(img.CharacterID),
			Angle:       img.Angle,
			ImageFormat: img.ImageFormat,
			Width:       int32PtrFromIntPtr(pgInt4ToIntPtr(img.Width)),
			Height:      int32PtrFromIntPtr(pgInt4ToIntPtr(img.Height)),
			IsPrimary:   pgBoolToBool(img.IsPrimary),
			CreatedAt:   pgTimestamptzToString(img.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListCharacterImagesResponse{
		Images: pbImages,
	}), nil
}

// GetCharacterImage retrieves a character image by ID
func (s *StoryboardService) GetCharacterImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacterImageRequest],
) (*connect.Response[storyboardv1.CharacterImage], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	img, err := s.queries.GetCharacterImage(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.CharacterImage{
		Id:          pgUUIDToString(img.ID),
		CharacterId: pgUUIDToString(img.CharacterID),
		Angle:       img.Angle,
		ImageFormat: img.ImageFormat,
		Width:       pgInt4ToInt32(img.Width),
		Height:      pgInt4ToInt32(img.Height),
		IsPrimary:   img.IsPrimary.Valid && img.IsPrimary.Bool,
		CreatedAt:   pgTimestamptzToString(img.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
	}), nil
}

// GetCharacterImageData retrieves character image data as base64
func (s *StoryboardService) GetCharacterImageData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacterImageDataRequest],
) (*connect.Response[storyboardv1.GetCharacterImageDataResponse], error) {
	imageID, err := uuid.Parse(req.Msg.ImageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetCharacterImageData(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.ImageData)

	return connect.NewResponse(&storyboardv1.GetCharacterImageDataResponse{
		ImageDataBase64: base64Data,
		ImageFormat:     result.ImageFormat,
	}), nil
}

// UploadCharacterImage uploads a character image
func (s *StoryboardService) UploadCharacterImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadCharacterImageRequest],
) (*connect.Response[storyboardv1.UploadCharacterImageResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	imageData, err := base64.StdEncoding.DecodeString(req.Msg.ImageDataBase64)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	imageFormat := "png"
	if req.Msg.ImageFormat != nil {
		imageFormat = *req.Msg.ImageFormat
	}

	isPrimary := false
	if req.Msg.IsPrimary != nil {
		isPrimary = *req.Msg.IsPrimary
	}

	if isPrimary {
		err = s.queries.UpdateCharacterImagePrimary(ctx, uuidToPgUUID(characterID))
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	var width *int
	if req.Msg.Width != nil {
		w := int(*req.Msg.Width)
		width = &w
	}

	var height *int
	if req.Msg.Height != nil {
		h := int(*req.Msg.Height)
		height = &h
	}

	img, err := s.queries.CreateCharacterImage(ctx, sqlc.CreateCharacterImageParams{
		CharacterID: uuidToPgUUID(characterID),
		Angle:       req.Msg.Angle,
		ImageData:   imageData,
		ImageFormat: imageFormat,
		Width:       intPtrToPgInt4(width),
		Height:      intPtrToPgInt4(height),
		IsPrimary:   boolToPgBool(isPrimary),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.UploadCharacterImageResponse{
		Image: &storyboardv1.CharacterImage{
			Id:          pgUUIDToString(img.ID),
			CharacterId: pgUUIDToString(img.CharacterID),
			Angle:       img.Angle,
			ImageFormat: img.ImageFormat,
			Width:       int32PtrFromIntPtr(pgInt4ToIntPtr(img.Width)),
			Height:      int32PtrFromIntPtr(pgInt4ToIntPtr(img.Height)),
			IsPrimary:   pgBoolToBool(img.IsPrimary),
			CreatedAt:   pgTimestamptzToString(img.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
		},
	}), nil
}

// DeleteCharacterImage deletes a character image
func (s *StoryboardService) DeleteCharacterImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteCharacterImageRequest],
) (*connect.Response[storyboardv1.DeleteCharacterImageResponse], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteCharacterImage(ctx, uuidToPgUUID(imageID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteCharacterImageResponse{
		Success: true,
	}), nil
}

// ListCharacter3DModels lists 3D models for a character
func (s *StoryboardService) ListCharacter3DModels(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListCharacter3DModelsRequest],
) (*connect.Response[storyboardv1.ListCharacter3DModelsResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	models, err := s.queries.ListCharacter3DModels(ctx, uuidToPgUUID(characterID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbModels := make([]*storyboardv1.Character3DModel, 0, len(models))
	for _, model := range models {
		var metadata *string
		if len(model.Metadata) > 0 {
			metaStr := string(model.Metadata)
			metadata = &metaStr
		}
		pbModels = append(pbModels, &storyboardv1.Character3DModel{
			Id:          pgUUIDToString(model.ID),
			CharacterId: pgUUIDToString(model.CharacterID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metadata,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListCharacter3DModelsResponse{
		Models: pbModels,
	}), nil
}

// GetCharacter3DModel retrieves a character 3D model by ID
func (s *StoryboardService) GetCharacter3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacter3DModelRequest],
) (*connect.Response[storyboardv1.Character3DModel], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	model, err := s.queries.GetCharacter3DModel(ctx, uuidToPgUUID(modelID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var metadata *string
	if len(model.Metadata) > 0 {
		metaStr := string(model.Metadata)
		metadata = &metaStr
	}

	return connect.NewResponse(&storyboardv1.Character3DModel{
		Id:          pgUUIDToString(model.ID),
		CharacterId: pgUUIDToString(model.CharacterID),
		ModelFormat: model.ModelFormat,
		IsPrimary:   pgBoolToBool(model.IsPrimary),
		Metadata:    metadata,
		CreatedAt:   pgTimestamptzToString(model.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
	}), nil
}

// GetCharacter3DModelData retrieves character 3D model data
func (s *StoryboardService) GetCharacter3DModelData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetCharacter3DModelDataRequest],
) (*connect.Response[storyboardv1.GetCharacter3DModelDataResponse], error) {
	modelID, err := uuid.Parse(req.Msg.ModelId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetCharacter3DModelData(ctx, uuidToPgUUID(modelID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Model := base64.StdEncoding.EncodeToString(result.ModelData)
	base64Textures := make([]string, 0, len(result.TextureData))
	for _, texture := range result.TextureData {
		base64Textures = append(base64Textures, base64.StdEncoding.EncodeToString(texture))
	}

	var metadata *string
	if len(result.Metadata) > 0 {
		metaStr := string(result.Metadata)
		metadata = &metaStr
	}

	return connect.NewResponse(&storyboardv1.GetCharacter3DModelDataResponse{
		ModelDataBase64:   base64Model,
		ModelFormat:       result.ModelFormat,
		TextureDataBase64: base64Textures,
		Metadata:          metadata,
	}), nil
}

// UploadCharacter3DModel uploads a character 3D model
func (s *StoryboardService) UploadCharacter3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadCharacter3DModelRequest],
) (*connect.Response[storyboardv1.UploadCharacter3DModelResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	modelData, err := base64.StdEncoding.DecodeString(req.Msg.ModelDataBase64)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	textureData := make([][]byte, 0, len(req.Msg.TextureDataBase64))
	for _, texBase64 := range req.Msg.TextureDataBase64 {
		texData, err := base64.StdEncoding.DecodeString(texBase64)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		textureData = append(textureData, texData)
	}

	isPrimary := false
	if req.Msg.IsPrimary != nil {
		isPrimary = *req.Msg.IsPrimary
	}

	if isPrimary {
		err = s.queries.UpdateCharacter3DModelPrimary(ctx, uuidToPgUUID(characterID))
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	var metadata json.RawMessage
	if req.Msg.Metadata != nil {
		metadata = json.RawMessage(*req.Msg.Metadata)
	}

	model, err := s.queries.CreateCharacter3DModel(ctx, sqlc.CreateCharacter3DModelParams{
		CharacterID: uuidToPgUUID(characterID),
		ModelFormat: req.Msg.ModelFormat,
		ModelData:   modelData,
		TextureData: textureData,
		IsPrimary:   boolToPgBool(isPrimary),
		Metadata:    metadata,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var metaStr *string
	if len(model.Metadata) > 0 {
		metaStr = stringPtr(string(model.Metadata))
	}

	return connect.NewResponse(&storyboardv1.UploadCharacter3DModelResponse{
		Model: &storyboardv1.Character3DModel{
			Id:          pgUUIDToString(model.ID),
			CharacterId: pgUUIDToString(model.CharacterID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metaStr,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		},
	}), nil
}

// DeleteCharacter3DModel deletes a character 3D model
func (s *StoryboardService) DeleteCharacter3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteCharacter3DModelRequest],
) (*connect.Response[storyboardv1.DeleteCharacter3DModelResponse], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteCharacter3DModel(ctx, uuidToPgUUID(modelID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteCharacter3DModelResponse{
		Success: true,
	}), nil
}

// Helper function to convert sqlc.ListCharactersRow to storyboardv1.Character
func characterRowToPB(char sqlc.ListCharactersRow) *storyboardv1.Character {
	pbChar := &storyboardv1.Character{
		Id:                 pgUUIDToString(char.ID),
		ProjectId:          pgUUIDToString(char.ProjectID),
		Name:               char.Name,
		Description:        pgTextToString(char.Description),
		Personality:        pgTextToString(char.Personality),
		Background:         pgTextToString(char.Background),
		DefaultHumeVoiceId: pgTextToString(char.DefaultHumeVoiceID),
		Age:                pgInt4ToInt32(char.Age),
		Gender:             pgTextToString(char.Gender),
		HeightCm:           pgInt4ToInt32(char.HeightCm),
		WeightKg:           pgNumericToFloat64(char.WeightKg),
		HairColor:          pgTextToString(char.HairColor),
		EyeColor:           pgTextToString(char.EyeColor),
		CreatedAt:          pgTimestamptzToString(char.CreatedAt),
		UpdatedAt:          pgTimestamptzToString(char.UpdatedAt),
	}

	if char.ProfileImageID.Valid {
		pbChar.ProfileImageId = stringPtr(pgUUIDToString(char.ProfileImageID))
	}

	if char.BirthDate.Valid {
		birthStr := char.BirthDate.Time.Format(time.RFC3339)
		pbChar.BirthDate = &birthStr
	}

	if char.OccupationID.Valid {
		pbChar.OccupationId = stringPtr(pgUUIDToString(char.OccupationID))
	}

	if char.OrganizationID.Valid {
		pbChar.OrganizationId = stringPtr(pgUUIDToString(char.OrganizationID))
	}

	if len(char.AttributesJson) > 0 {
		attrStr := string(char.AttributesJson)
		pbChar.AttributesJson = &attrStr
	}

	return pbChar
}

// Helper function to convert sqlc.GetCharacterRow to storyboardv1.Character
func characterGetRowToPB(char sqlc.GetCharacterRow) *storyboardv1.Character {
	return characterRowToPB(sqlc.ListCharactersRow{
		ID:                 char.ID,
		ProjectID:          char.ProjectID,
		Name:               char.Name,
		Description:        char.Description,
		Personality:        char.Personality,
		Background:         char.Background,
		DefaultHumeVoiceID: char.DefaultHumeVoiceID,
		ProfileImageID:     char.ProfileImageID,
		Age:                char.Age,
		Gender:             char.Gender,
		BirthDate:          char.BirthDate,
		HeightCm:           char.HeightCm,
		WeightKg:           char.WeightKg,
		HairColor:          char.HairColor,
		EyeColor:           char.EyeColor,
		OccupationID:       char.OccupationID,
		OrganizationID:     char.OrganizationID,
		AttributesJson:     char.AttributesJson,
		CreatedAt:          char.CreatedAt,
		UpdatedAt:          char.UpdatedAt,
	})
}

// Helper function to convert sqlc.CreateCharacterRow to storyboardv1.Character
func characterCreateRowToPB(char sqlc.CreateCharacterRow) *storyboardv1.Character {
	return characterRowToPB(sqlc.ListCharactersRow{
		ID:                 char.ID,
		ProjectID:          char.ProjectID,
		Name:               char.Name,
		Description:        char.Description,
		Personality:        char.Personality,
		Background:         char.Background,
		DefaultHumeVoiceID: char.DefaultHumeVoiceID,
		ProfileImageID:     char.ProfileImageID,
		Age:                char.Age,
		Gender:             char.Gender,
		BirthDate:          char.BirthDate,
		HeightCm:           char.HeightCm,
		WeightKg:           char.WeightKg,
		HairColor:          char.HairColor,
		EyeColor:           char.EyeColor,
		OccupationID:       char.OccupationID,
		OrganizationID:     char.OrganizationID,
		AttributesJson:     char.AttributesJson,
		CreatedAt:          char.CreatedAt,
		UpdatedAt:          char.UpdatedAt,
	})
}

// Helper function to convert sqlc.UpdateCharacterRow to storyboardv1.Character
func characterUpdateRowToPB(char sqlc.UpdateCharacterRow) *storyboardv1.Character {
	return characterRowToPB(sqlc.ListCharactersRow{
		ID:                 char.ID,
		ProjectID:          char.ProjectID,
		Name:               char.Name,
		Description:        char.Description,
		Personality:        char.Personality,
		Background:         char.Background,
		DefaultHumeVoiceID: char.DefaultHumeVoiceID,
		ProfileImageID:     char.ProfileImageID,
		Age:                char.Age,
		Gender:             char.Gender,
		BirthDate:          char.BirthDate,
		HeightCm:           char.HeightCm,
		WeightKg:           char.WeightKg,
		HairColor:          char.HairColor,
		EyeColor:           char.EyeColor,
		OccupationID:       char.OccupationID,
		OrganizationID:     char.OrganizationID,
		AttributesJson:     char.AttributesJson,
		CreatedAt:          char.CreatedAt,
		UpdatedAt:          char.UpdatedAt,
	})
}
