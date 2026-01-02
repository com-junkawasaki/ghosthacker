package service

import (
	"context"
	"encoding/base64"
	"encoding/json"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListProps lists props for a project
func (s *StoryboardService) ListProps(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListPropsRequest],
) (*connect.Response[storyboardv1.ListPropsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var categoryStr string
	if req.Msg.Category != nil {
		categoryStr = *req.Msg.Category
	}

	var tags []string
	if len(req.Msg.Tags) > 0 {
		tags = req.Msg.Tags
	}

	props, err := s.queries.ListProps(ctx, sqlc.ListPropsParams{
		ProjectID: uuidToPgUUID(projectID),
		Column2:   categoryStr,
		Column3:   tags,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbProps := make([]*storyboardv1.Prop, 0, len(props))
	for _, prop := range props {
		pbProp := propToPB(prop)
		pbProps = append(pbProps, pbProp)
	}

	return connect.NewResponse(&storyboardv1.ListPropsResponse{
		Props: pbProps,
	}), nil
}

// GetProp retrieves a prop by ID
func (s *StoryboardService) GetProp(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetPropRequest],
) (*connect.Response[storyboardv1.Prop], error) {
	propID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	prop, err := s.queries.GetProp(ctx, uuidToPgUUID(propID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(propToPB(prop)), nil
}

// CreateProp creates a new prop
func (s *StoryboardService) CreateProp(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreatePropRequest],
) (*connect.Response[storyboardv1.Prop], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	var attributesJSON json.RawMessage
	if req.Msg.AttributesJson != nil {
		attributesJSON = json.RawMessage(*req.Msg.AttributesJson)
	}

	var ownerCharacterID *uuid.UUID
	if req.Msg.OwnerCharacterId != nil {
		ownerID, err := uuid.Parse(*req.Msg.OwnerCharacterId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		ownerCharacterID = &ownerID
	}

	var locationID *uuid.UUID
	if req.Msg.LocationId != nil {
		locID, err := uuid.Parse(*req.Msg.LocationId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		locationID = &locID
	}

	var relatedTechnologyID *uuid.UUID
	if req.Msg.RelatedTechnologyId != nil {
		techID, err := uuid.Parse(*req.Msg.RelatedTechnologyId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		relatedTechnologyID = &techID
	}

	valueCurrency := "JPY"
	if req.Msg.ValueCurrency != nil {
		valueCurrency = *req.Msg.ValueCurrency
	}

	prop, err := s.queries.CreateProp(ctx, sqlc.CreatePropParams{
		ProjectID:           uuidToPgUUID(projectID),
		OrgID:               stringToPgText(&orgID),
		Name:                req.Msg.Name,
		Description:         stringToPgText(req.Msg.Description),
		Category:            stringToPgText(req.Msg.Category),
		Material:            stringToPgText(req.Msg.Material),
		Size:                stringToPgText(req.Msg.Size),
		WeightKg:            float64ToPgNumeric(req.Msg.WeightKg),
		ValueAmount:         float64ToPgNumeric(req.Msg.ValueAmount),
		ValueCurrency:       stringToPgText(&valueCurrency),
		Rarity:              stringToPgText(req.Msg.Rarity),
		FunctionDescription: stringToPgText(req.Msg.FunctionDescription),
		OwnerCharacterID:    uuidToPgUUIDPtr(ownerCharacterID),
		LocationID:          uuidToPgUUIDPtr(locationID),
		RelatedTechnologyID: uuidToPgUUIDPtr(relatedTechnologyID),
		Tags:                req.Msg.Tags,
		AttributesJson:      attributesJSON,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(propToPB(prop)), nil
}

// UpdateProp updates an existing prop
func (s *StoryboardService) UpdateProp(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdatePropRequest],
) (*connect.Response[storyboardv1.Prop], error) {
	propID, err := uuid.Parse(req.Msg.Id)
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

	var ownerCharacterID *uuid.UUID
	if req.Msg.OwnerCharacterId != nil {
		ownerID, err := uuid.Parse(*req.Msg.OwnerCharacterId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		ownerCharacterID = &ownerID
	}

	var locationID *uuid.UUID
	if req.Msg.LocationId != nil {
		locID, err := uuid.Parse(*req.Msg.LocationId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		locationID = &locID
	}

	var relatedTechnologyID *uuid.UUID
	if req.Msg.RelatedTechnologyId != nil {
		techID, err := uuid.Parse(*req.Msg.RelatedTechnologyId)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		relatedTechnologyID = &techID
	}

	var valueCurrency *string
	if req.Msg.ValueCurrency != nil {
		valueCurrency = req.Msg.ValueCurrency
	}

	prop, err := s.queries.UpdateProp(ctx, sqlc.UpdatePropParams{
		ID:                  uuidToPgUUID(propID),
		Name:                name,
		Description:         stringToPgText(req.Msg.Description),
		Category:            stringToPgText(req.Msg.Category),
		Material:            stringToPgText(req.Msg.Material),
		Size:                stringToPgText(req.Msg.Size),
		WeightKg:            float64ToPgNumeric(req.Msg.WeightKg),
		ValueAmount:         float64ToPgNumeric(req.Msg.ValueAmount),
		ValueCurrency:       stringToPgText(valueCurrency),
		Rarity:              stringToPgText(req.Msg.Rarity),
		FunctionDescription: stringToPgText(req.Msg.FunctionDescription),
		OwnerCharacterID:    uuidToPgUUIDPtr(ownerCharacterID),
		LocationID:          uuidToPgUUIDPtr(locationID),
		RelatedTechnologyID: uuidToPgUUIDPtr(relatedTechnologyID),
		Tags:                req.Msg.Tags,
		AttributesJson:      attributesJSON,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(propToPB(prop)), nil
}

// DeleteProp deletes a prop
func (s *StoryboardService) DeleteProp(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeletePropRequest],
) (*connect.Response[storyboardv1.DeletePropResponse], error) {
	propID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteProp(ctx, uuidToPgUUID(propID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeletePropResponse{
		Success: true,
	}), nil
}

// ListPropImages lists images for a prop
func (s *StoryboardService) ListPropImages(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListPropImagesRequest],
) (*connect.Response[storyboardv1.ListPropImagesResponse], error) {
	propID, err := uuid.Parse(req.Msg.PropId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	images, err := s.queries.ListPropImages(ctx, uuidToPgUUID(propID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbImages := make([]*storyboardv1.PropImage, 0, len(images))
	for _, img := range images {
		pbImages = append(pbImages, &storyboardv1.PropImage{
			Id:          pgUUIDToString(img.ID),
			PropId:      pgUUIDToString(img.PropID),
			Angle:       img.Angle,
			ImageFormat: img.ImageFormat,
			Width:       int32PtrFromIntPtr(pgInt4ToIntPtr(img.Width)),
			Height:      int32PtrFromIntPtr(pgInt4ToIntPtr(img.Height)),
			IsPrimary:   pgBoolToBool(img.IsPrimary),
			CreatedAt:   pgTimestamptzToString(img.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListPropImagesResponse{
		Images: pbImages,
	}), nil
}

// GetPropImage retrieves a prop image by ID
func (s *StoryboardService) GetPropImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetPropImageRequest],
) (*connect.Response[storyboardv1.PropImage], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	img, err := s.queries.GetPropImage(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.PropImage{
		Id:          pgUUIDToString(img.ID),
		PropId:      pgUUIDToString(img.PropID),
		Angle:       img.Angle,
		ImageFormat: img.ImageFormat,
		Width:       int32PtrFromIntPtr(pgInt4ToIntPtr(img.Width)),
		Height:      int32PtrFromIntPtr(pgInt4ToIntPtr(img.Height)),
		IsPrimary:   pgBoolToBool(img.IsPrimary),
		CreatedAt:   pgTimestamptzToString(img.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
	}), nil
}

// GetPropImageData retrieves prop image data as base64
func (s *StoryboardService) GetPropImageData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetPropImageDataRequest],
) (*connect.Response[storyboardv1.GetPropImageDataResponse], error) {
	imageID, err := uuid.Parse(req.Msg.ImageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetPropImageData(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.ImageData)

	return connect.NewResponse(&storyboardv1.GetPropImageDataResponse{
		ImageDataBase64: base64Data,
		ImageFormat:     result.ImageFormat,
	}), nil
}

// UploadPropImage uploads a prop image
func (s *StoryboardService) UploadPropImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadPropImageRequest],
) (*connect.Response[storyboardv1.UploadPropImageResponse], error) {
	propID, err := uuid.Parse(req.Msg.PropId)
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
		err = s.queries.UpdatePropImagePrimary(ctx, uuidToPgUUID(propID))
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

	img, err := s.queries.CreatePropImage(ctx, sqlc.CreatePropImageParams{
		PropID:      uuidToPgUUID(propID),
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

	return connect.NewResponse(&storyboardv1.UploadPropImageResponse{
		Image: &storyboardv1.PropImage{
			Id:          pgUUIDToString(img.ID),
			PropId:      pgUUIDToString(img.PropID),
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

// DeletePropImage deletes a prop image
func (s *StoryboardService) DeletePropImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeletePropImageRequest],
) (*connect.Response[storyboardv1.DeletePropImageResponse], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeletePropImage(ctx, uuidToPgUUID(imageID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeletePropImageResponse{
		Success: true,
	}), nil
}

// ListProp3DModels lists 3D models for a prop
func (s *StoryboardService) ListProp3DModels(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListProp3DModelsRequest],
) (*connect.Response[storyboardv1.ListProp3DModelsResponse], error) {
	propID, err := uuid.Parse(req.Msg.PropId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	models, err := s.queries.ListProp3DModels(ctx, uuidToPgUUID(propID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbModels := make([]*storyboardv1.Prop3DModel, 0, len(models))
	for _, model := range models {
		var metadata *string
		if len(model.Metadata) > 0 {
			metaStr := string(model.Metadata)
			metadata = &metaStr
		}
		pbModels = append(pbModels, &storyboardv1.Prop3DModel{
			Id:          pgUUIDToString(model.ID),
			PropId:      pgUUIDToString(model.PropID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metadata,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListProp3DModelsResponse{
		Models: pbModels,
	}), nil
}

// GetProp3DModel retrieves a prop 3D model by ID
func (s *StoryboardService) GetProp3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProp3DModelRequest],
) (*connect.Response[storyboardv1.Prop3DModel], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	model, err := s.queries.GetProp3DModel(ctx, uuidToPgUUID(modelID))
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

	return connect.NewResponse(&storyboardv1.Prop3DModel{
		Id:          pgUUIDToString(model.ID),
		PropId:      pgUUIDToString(model.PropID),
		ModelFormat: model.ModelFormat,
		IsPrimary:   pgBoolToBool(model.IsPrimary),
		Metadata:    metadata,
		CreatedAt:   pgTimestamptzToString(model.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
	}), nil
}

// GetProp3DModelData retrieves prop 3D model data
func (s *StoryboardService) GetProp3DModelData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProp3DModelDataRequest],
) (*connect.Response[storyboardv1.GetProp3DModelDataResponse], error) {
	modelID, err := uuid.Parse(req.Msg.ModelId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetProp3DModelData(ctx, uuidToPgUUID(modelID))
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

	return connect.NewResponse(&storyboardv1.GetProp3DModelDataResponse{
		ModelDataBase64:   base64Model,
		ModelFormat:       result.ModelFormat,
		TextureDataBase64: base64Textures,
		Metadata:          metadata,
	}), nil
}

// UploadProp3DModel uploads a prop 3D model
func (s *StoryboardService) UploadProp3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadProp3DModelRequest],
) (*connect.Response[storyboardv1.UploadProp3DModelResponse], error) {
	propID, err := uuid.Parse(req.Msg.PropId)
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
		err = s.queries.UpdateProp3DModelPrimary(ctx, uuidToPgUUID(propID))
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	var metadata json.RawMessage
	if req.Msg.Metadata != nil {
		metadata = json.RawMessage(*req.Msg.Metadata)
	}

	model, err := s.queries.CreateProp3DModel(ctx, sqlc.CreateProp3DModelParams{
		PropID:      uuidToPgUUID(propID),
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

	return connect.NewResponse(&storyboardv1.UploadProp3DModelResponse{
		Model: &storyboardv1.Prop3DModel{
			Id:          pgUUIDToString(model.ID),
			PropId:      pgUUIDToString(model.PropID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metaStr,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		},
	}), nil
}

// DeleteProp3DModel deletes a prop 3D model
func (s *StoryboardService) DeleteProp3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteProp3DModelRequest],
) (*connect.Response[storyboardv1.DeleteProp3DModelResponse], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteProp3DModel(ctx, uuidToPgUUID(modelID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteProp3DModelResponse{
		Success: true,
	}), nil
}

// Helper function to convert sqlc.Prop to storyboardv1.Prop
func propToPB(prop sqlc.Prop) *storyboardv1.Prop {
	pbProp := &storyboardv1.Prop{
		Id:          pgUUIDToString(prop.ID),
		ProjectId:   pgUUIDToString(prop.ProjectID),
		Name:        prop.Name,
		Description: pgTextToString(prop.Description),
		Category:    pgTextToString(prop.Category),
		Material:    pgTextToString(prop.Material),
		Size:        pgTextToString(prop.Size),
		WeightKg:    pgNumericToFloat64(prop.WeightKg),
		ValueAmount: pgNumericToFloat64(prop.ValueAmount),
		ValueCurrency: func() string {
			s := pgTextToString(prop.ValueCurrency)
			if s == nil {
				return ""
			}
			return *s
		}(),
		Rarity:              pgTextToString(prop.Rarity),
		FunctionDescription: pgTextToString(prop.FunctionDescription),
		Tags:                prop.Tags,
		CreatedAt:           pgTimestamptzToString(prop.CreatedAt),
		UpdatedAt:           pgTimestamptzToString(prop.UpdatedAt),
	}

	if prop.OrgID.Valid {
		pbProp.OrgId = stringPtr(prop.OrgID.String)
	}

	if prop.OwnerCharacterID.Valid {
		pbProp.OwnerCharacterId = stringPtr(pgUUIDToString(prop.OwnerCharacterID))
	}

	if prop.LocationID.Valid {
		pbProp.LocationId = stringPtr(pgUUIDToString(prop.LocationID))
	}

	if prop.RelatedTechnologyID.Valid {
		pbProp.RelatedTechnologyId = stringPtr(pgUUIDToString(prop.RelatedTechnologyID))
	}

	if len(prop.AttributesJson) > 0 {
		attrStr := string(prop.AttributesJson)
		pbProp.AttributesJson = &attrStr
	}

	return pbProp
}
