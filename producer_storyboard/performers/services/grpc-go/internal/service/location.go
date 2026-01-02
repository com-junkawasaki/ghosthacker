package service

import (
	"context"
	"encoding/base64"
	"encoding/json"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListLocations lists locations for a project
func (s *StoryboardService) ListLocations(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListLocationsRequest],
) (*connect.Response[storyboardv1.ListLocationsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	var parentLocationIDPg pgtype.UUID
	if req.Msg.ParentLocationId != nil && *req.Msg.ParentLocationId != "" {
		parentID, err := uuid.Parse(*req.Msg.ParentLocationId)
		if err == nil {
			parentLocationIDPg = uuidToPgUUID(parentID)
		}
	}

	locations, err := s.queries.ListLocations(ctx, sqlc.ListLocationsParams{
		ProjectID: uuidToPgUUID(projectID),
		OrgID:     orgIDPg,
		Column3:   parentLocationIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbLocations := make([]*storyboardv1.Location, 0, len(locations))
	for _, loc := range locations {
		pbLocations = append(pbLocations, locationRowToPB(loc))
	}

	return connect.NewResponse(&storyboardv1.ListLocationsResponse{
		Locations: pbLocations,
	}), nil
}

// GetLocation retrieves a location by ID
func (s *StoryboardService) GetLocation(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetLocationRequest],
) (*connect.Response[storyboardv1.Location], error) {
	locationID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	loc, err := s.queries.GetLocation(ctx, sqlc.GetLocationParams{
		ID:    uuidToPgUUID(locationID),
		OrgID: orgIDPg,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(locationGetRowToPB(loc)), nil
}

// CreateLocation creates a new location
func (s *StoryboardService) CreateLocation(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateLocationRequest],
) (*connect.Response[storyboardv1.Location], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	var parentLocationIDPg pgtype.UUID
	if req.Msg.ParentLocationId != nil && *req.Msg.ParentLocationId != "" {
		parentID, err := uuid.Parse(*req.Msg.ParentLocationId)
		if err == nil {
			parentLocationIDPg = uuidToPgUUID(parentID)
		}
	}

	var imageIDPg pgtype.UUID
	if req.Msg.ImageId != nil && *req.Msg.ImageId != "" {
		imgID, err := uuid.Parse(*req.Msg.ImageId)
		if err == nil {
			imageIDPg = uuidToPgUUID(imgID)
		}
	}

	// Parse metadata JSON if provided
	var metadataBytes []byte
	if req.Msg.Metadata != nil && *req.Msg.Metadata != "" {
		metadataBytes = []byte(*req.Msg.Metadata)
	}

	loc, err := s.queries.CreateLocation(ctx, sqlc.CreateLocationParams{
		ProjectID:        uuidToPgUUID(projectID),
		OrgID:            orgIDPg,
		Name:             req.Msg.Name,
		Description:      stringToPgText(req.Msg.Description),
		ParentLocationID: parentLocationIDPg,
		ImageID:          imageIDPg,
		LocationType:     stringToPgText(req.Msg.LocationType),
		Address:          stringToPgText(req.Msg.Address),
		Latitude:         float64ToPgNumeric(req.Msg.Latitude),
		Longitude:        float64ToPgNumeric(req.Msg.Longitude),
		SizeSqm:          float64ToPgNumeric(req.Msg.SizeSqm),
		Capacity:         int32ToPgInt4(req.Msg.Capacity),
		Atmosphere:       stringToPgText(req.Msg.Atmosphere),
		Accessibility:    stringToPgText(req.Msg.Accessibility),
		SafetyLevel:      stringToPgText(req.Msg.SafetyLevel),
		Metadata:         metadataBytes,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(locationCreateRowToPB(loc)), nil
}

// UpdateLocation updates an existing location
func (s *StoryboardService) UpdateLocation(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateLocationRequest],
) (*connect.Response[storyboardv1.Location], error) {
	locationID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	name := ""
	if req.Msg.Name != nil {
		name = *req.Msg.Name
	}

	var parentLocationIDPg pgtype.UUID
	if req.Msg.ParentLocationId != nil && *req.Msg.ParentLocationId != "" {
		parentID, err := uuid.Parse(*req.Msg.ParentLocationId)
		if err == nil {
			parentLocationIDPg = uuidToPgUUID(parentID)
		}
	}

	var imageIDPg pgtype.UUID
	if req.Msg.ImageId != nil && *req.Msg.ImageId != "" {
		imgID, err := uuid.Parse(*req.Msg.ImageId)
		if err == nil {
			imageIDPg = uuidToPgUUID(imgID)
		}
	}

	// Parse metadata JSON if provided
	var metadataBytes []byte
	if req.Msg.Metadata != nil && *req.Msg.Metadata != "" {
		metadataBytes = []byte(*req.Msg.Metadata)
	}

	loc, err := s.queries.UpdateLocation(ctx, sqlc.UpdateLocationParams{
		ID:               uuidToPgUUID(locationID),
		OrgID:            orgIDPg,
		Name:             name,
		Description:      stringToPgText(req.Msg.Description),
		ParentLocationID: parentLocationIDPg,
		ImageID:          imageIDPg,
		LocationType:     stringToPgText(req.Msg.LocationType),
		Address:          stringToPgText(req.Msg.Address),
		Latitude:         float64ToPgNumeric(req.Msg.Latitude),
		Longitude:        float64ToPgNumeric(req.Msg.Longitude),
		SizeSqm:          float64ToPgNumeric(req.Msg.SizeSqm),
		Capacity:         int32ToPgInt4(req.Msg.Capacity),
		Atmosphere:       stringToPgText(req.Msg.Atmosphere),
		Accessibility:    stringToPgText(req.Msg.Accessibility),
		SafetyLevel:      stringToPgText(req.Msg.SafetyLevel),
		Metadata:         metadataBytes,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(locationUpdateRowToPB(loc)), nil
}

// DeleteLocation deletes a location
func (s *StoryboardService) DeleteLocation(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteLocationRequest],
) (*connect.Response[storyboardv1.DeleteLocationResponse], error) {
	locationID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.DeleteLocation(ctx, sqlc.DeleteLocationParams{
		ID:    uuidToPgUUID(locationID),
		OrgID: orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteLocationResponse{
		Success: true,
	}), nil
}

// ListLocationImages lists images for a location
func (s *StoryboardService) ListLocationImages(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListLocationImagesRequest],
) (*connect.Response[storyboardv1.ListLocationImagesResponse], error) {
	locationID, err := uuid.Parse(req.Msg.LocationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	images, err := s.queries.ListLocationImages(ctx, uuidToPgUUID(locationID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbImages := make([]*storyboardv1.LocationImage, 0, len(images))
	for _, img := range images {
		pbImages = append(pbImages, &storyboardv1.LocationImage{
			Id:          pgUUIDToString(img.ID),
			LocationId:  pgUUIDToString(img.LocationID),
			Angle:       img.Angle,
			ImageFormat: img.ImageFormat,
			Width:       int32PtrFromIntPtr(pgInt4ToIntPtr(img.Width)),
			Height:      int32PtrFromIntPtr(pgInt4ToIntPtr(img.Height)),
			IsPrimary:   pgBoolToBool(img.IsPrimary),
			CreatedAt:   pgTimestamptzToString(img.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListLocationImagesResponse{
		Images: pbImages,
	}), nil
}

// GetLocationImage retrieves a location image by ID
func (s *StoryboardService) GetLocationImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetLocationImageRequest],
) (*connect.Response[storyboardv1.LocationImage], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	img, err := s.queries.GetLocationImage(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.LocationImage{
		Id:          pgUUIDToString(img.ID),
		LocationId:  pgUUIDToString(img.LocationID),
		Angle:       img.Angle,
		ImageFormat: img.ImageFormat,
		Width:       pgInt4ToInt32(img.Width),
		Height:      pgInt4ToInt32(img.Height),
		IsPrimary:   pgBoolToBool(img.IsPrimary),
		CreatedAt:   pgTimestamptzToString(img.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(img.UpdatedAt),
	}), nil
}

// GetLocationImageData retrieves location image data as base64
func (s *StoryboardService) GetLocationImageData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetLocationImageDataRequest],
) (*connect.Response[storyboardv1.GetLocationImageDataResponse], error) {
	imageID, err := uuid.Parse(req.Msg.ImageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetLocationImageData(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.ImageData)

	return connect.NewResponse(&storyboardv1.GetLocationImageDataResponse{
		ImageDataBase64: base64Data,
		ImageFormat:     result.ImageFormat,
	}), nil
}

// UploadLocationImage uploads a location image
func (s *StoryboardService) UploadLocationImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadLocationImageRequest],
) (*connect.Response[storyboardv1.UploadLocationImageResponse], error) {
	locationID, err := uuid.Parse(req.Msg.LocationId)
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
		err = s.queries.UpdateLocationImagePrimary(ctx, uuidToPgUUID(locationID))
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

	img, err := s.queries.CreateLocationImage(ctx, sqlc.CreateLocationImageParams{
		LocationID:  uuidToPgUUID(locationID),
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

	return connect.NewResponse(&storyboardv1.UploadLocationImageResponse{
		Image: &storyboardv1.LocationImage{
			Id:          pgUUIDToString(img.ID),
			LocationId:  pgUUIDToString(img.LocationID),
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

// DeleteLocationImage deletes a location image
func (s *StoryboardService) DeleteLocationImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteLocationImageRequest],
) (*connect.Response[storyboardv1.DeleteLocationImageResponse], error) {
	imageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteLocationImage(ctx, uuidToPgUUID(imageID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteLocationImageResponse{
		Success: true,
	}), nil
}

// ListLocation3DModels lists 3D models for a location
func (s *StoryboardService) ListLocation3DModels(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListLocation3DModelsRequest],
) (*connect.Response[storyboardv1.ListLocation3DModelsResponse], error) {
	locationID, err := uuid.Parse(req.Msg.LocationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	models, err := s.queries.ListLocation3DModels(ctx, uuidToPgUUID(locationID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbModels := make([]*storyboardv1.Location3DModel, 0, len(models))
	for _, model := range models {
		var metadata *string
		if len(model.Metadata) > 0 {
			metaStr := string(model.Metadata)
			metadata = &metaStr
		}
		pbModels = append(pbModels, &storyboardv1.Location3DModel{
			Id:          pgUUIDToString(model.ID),
			LocationId:  pgUUIDToString(model.LocationID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metadata,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListLocation3DModelsResponse{
		Models: pbModels,
	}), nil
}

// GetLocation3DModel retrieves a location 3D model by ID
func (s *StoryboardService) GetLocation3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetLocation3DModelRequest],
) (*connect.Response[storyboardv1.Location3DModel], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	model, err := s.queries.GetLocation3DModel(ctx, uuidToPgUUID(modelID))
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

	return connect.NewResponse(&storyboardv1.Location3DModel{
		Id:          pgUUIDToString(model.ID),
		LocationId:  pgUUIDToString(model.LocationID),
		ModelFormat: model.ModelFormat,
		IsPrimary:   pgBoolToBool(model.IsPrimary),
		Metadata:    metadata,
		CreatedAt:   pgTimestamptzToString(model.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
	}), nil
}

// GetLocation3DModelData retrieves location 3D model data
func (s *StoryboardService) GetLocation3DModelData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetLocation3DModelDataRequest],
) (*connect.Response[storyboardv1.GetLocation3DModelDataResponse], error) {
	modelID, err := uuid.Parse(req.Msg.ModelId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetLocation3DModelData(ctx, uuidToPgUUID(modelID))
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

	return connect.NewResponse(&storyboardv1.GetLocation3DModelDataResponse{
		ModelDataBase64:   base64Model,
		ModelFormat:       result.ModelFormat,
		TextureDataBase64: base64Textures,
		Metadata:          metadata,
	}), nil
}

// UploadLocation3DModel uploads a location 3D model
func (s *StoryboardService) UploadLocation3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.UploadLocation3DModelRequest],
) (*connect.Response[storyboardv1.UploadLocation3DModelResponse], error) {
	locationID, err := uuid.Parse(req.Msg.LocationId)
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
		err = s.queries.UpdateLocation3DModelPrimary(ctx, uuidToPgUUID(locationID))
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	var metadata json.RawMessage
	if req.Msg.Metadata != nil {
		metadata = json.RawMessage(*req.Msg.Metadata)
	}

	model, err := s.queries.CreateLocation3DModel(ctx, sqlc.CreateLocation3DModelParams{
		LocationID:  uuidToPgUUID(locationID),
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

	return connect.NewResponse(&storyboardv1.UploadLocation3DModelResponse{
		Model: &storyboardv1.Location3DModel{
			Id:          pgUUIDToString(model.ID),
			LocationId:  pgUUIDToString(model.LocationID),
			ModelFormat: model.ModelFormat,
			IsPrimary:   pgBoolToBool(model.IsPrimary),
			Metadata:    metaStr,
			CreatedAt:   pgTimestamptzToString(model.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(model.UpdatedAt),
		},
	}), nil
}

// DeleteLocation3DModel deletes a location 3D model
func (s *StoryboardService) DeleteLocation3DModel(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteLocation3DModelRequest],
) (*connect.Response[storyboardv1.DeleteLocation3DModelResponse], error) {
	modelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteLocation3DModel(ctx, uuidToPgUUID(modelID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteLocation3DModelResponse{
		Success: true,
	}), nil
}

// Helper function to convert sqlc.ListLocationsRow to storyboardv1.Location
func locationRowToPB(loc sqlc.ListLocationsRow) *storyboardv1.Location {
	pbLoc := &storyboardv1.Location{
		Id:            pgUUIDToString(loc.ID),
		ProjectId:     pgUUIDToString(loc.ProjectID),
		Name:          loc.Name,
		Description:   pgTextToString(loc.Description),
		LocationType:  pgTextToString(loc.LocationType),
		Address:       pgTextToString(loc.Address),
		Latitude:      pgNumericToFloat64(loc.Latitude),
		Longitude:     pgNumericToFloat64(loc.Longitude),
		SizeSqm:       pgNumericToFloat64(loc.SizeSqm),
		Capacity:      pgInt4ToInt32(loc.Capacity),
		Atmosphere:    pgTextToString(loc.Atmosphere),
		Accessibility: pgTextToString(loc.Accessibility),
		SafetyLevel:   pgTextToString(loc.SafetyLevel),
		CreatedAt:     pgTimestamptzToString(loc.CreatedAt),
		UpdatedAt:     pgTimestamptzToString(loc.UpdatedAt),
	}

	if loc.OrgID.Valid {
		pbLoc.OrgId = stringPtr(loc.OrgID.String)
	}

	if loc.ParentLocationID.Valid {
		parentIDStr := pgUUIDToString(loc.ParentLocationID)
		pbLoc.ParentLocationId = &parentIDStr
	}

	if loc.ImageID.Valid {
		imgIDStr := pgUUIDToString(loc.ImageID)
		pbLoc.ImageId = &imgIDStr
	}

	if loc.Metadata != nil && len(loc.Metadata) > 0 {
		metadataStr := string(loc.Metadata)
		pbLoc.Metadata = &metadataStr
	}

	return pbLoc
}

// Helper function to convert sqlc.GetLocationRow to storyboardv1.Location
func locationGetRowToPB(loc sqlc.GetLocationRow) *storyboardv1.Location {
	return locationRowToPB(sqlc.ListLocationsRow{
		ID:               loc.ID,
		ProjectID:        loc.ProjectID,
		OrgID:            loc.OrgID,
		Name:             loc.Name,
		Description:      loc.Description,
		ParentLocationID: loc.ParentLocationID,
		ImageID:          loc.ImageID,
		LocationType:     loc.LocationType,
		Address:          loc.Address,
		Latitude:         loc.Latitude,
		Longitude:        loc.Longitude,
		SizeSqm:          loc.SizeSqm,
		Capacity:         loc.Capacity,
		Atmosphere:       loc.Atmosphere,
		Accessibility:    loc.Accessibility,
		SafetyLevel:      loc.SafetyLevel,
		Metadata:         loc.Metadata,
		CreatedAt:        loc.CreatedAt,
		UpdatedAt:        loc.UpdatedAt,
	})
}

// Helper function to convert sqlc.CreateLocationRow to storyboardv1.Location
func locationCreateRowToPB(loc sqlc.CreateLocationRow) *storyboardv1.Location {
	return locationRowToPB(sqlc.ListLocationsRow{
		ID:               loc.ID,
		ProjectID:        loc.ProjectID,
		OrgID:            loc.OrgID,
		Name:             loc.Name,
		Description:      loc.Description,
		ParentLocationID: loc.ParentLocationID,
		ImageID:          loc.ImageID,
		LocationType:     loc.LocationType,
		Address:          loc.Address,
		Latitude:         loc.Latitude,
		Longitude:        loc.Longitude,
		SizeSqm:          loc.SizeSqm,
		Capacity:         loc.Capacity,
		Atmosphere:       loc.Atmosphere,
		Accessibility:    loc.Accessibility,
		SafetyLevel:      loc.SafetyLevel,
		Metadata:         loc.Metadata,
		CreatedAt:        loc.CreatedAt,
		UpdatedAt:        loc.UpdatedAt,
	})
}

// Helper function to convert sqlc.UpdateLocationRow to storyboardv1.Location
func locationUpdateRowToPB(loc sqlc.UpdateLocationRow) *storyboardv1.Location {
	return locationRowToPB(sqlc.ListLocationsRow{
		ID:               loc.ID,
		ProjectID:        loc.ProjectID,
		OrgID:            loc.OrgID,
		Name:             loc.Name,
		Description:      loc.Description,
		ParentLocationID: loc.ParentLocationID,
		ImageID:          loc.ImageID,
		LocationType:     loc.LocationType,
		Address:          loc.Address,
		Latitude:         loc.Latitude,
		Longitude:        loc.Longitude,
		SizeSqm:          loc.SizeSqm,
		Capacity:         loc.Capacity,
		Atmosphere:       loc.Atmosphere,
		Accessibility:    loc.Accessibility,
		SafetyLevel:      loc.SafetyLevel,
		Metadata:         loc.Metadata,
		CreatedAt:        loc.CreatedAt,
		UpdatedAt:        loc.UpdatedAt,
	})
}
