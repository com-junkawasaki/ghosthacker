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

// ListProjectAssets lists project assets
func (s *StoryboardService) ListProjectAssets(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListProjectAssetsRequest],
) (*connect.Response[storyboardv1.ListProjectAssetsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	var assetTypeStr string
	if req.Msg.AssetType != nil {
		assetTypeStr = *req.Msg.AssetType
	}

	var tagsStr []string
	if len(req.Msg.Tags) > 0 {
		tagsStr = req.Msg.Tags
	}

	assets, err := s.queries.ListProjectAssets(ctx, sqlc.ListProjectAssetsParams{
		ProjectID: uuidToPgUUID(projectID),
		OrgID:     orgIDPg,
		Column3:   assetTypeStr,
		Column4:   tagsStr,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbAssets := make([]*storyboardv1.ProjectAsset, 0, len(assets))
	for _, asset := range assets {
		tags := make([]string, 0)
		if asset.Tags != nil {
			tags = asset.Tags
		}

		var metadataStr *string
		if asset.Metadata != nil && len(asset.Metadata) > 0 {
			metadataBytes, err := json.Marshal(asset.Metadata)
			if err == nil {
				metadataStr = stringPtr(string(metadataBytes))
			}
		}

		pbAsset := &storyboardv1.ProjectAsset{
			Id:          pgUUIDToString(asset.ID),
			ProjectId:   pgUUIDToString(asset.ProjectID),
			AssetType:   asset.AssetType,
			AssetFormat: pgTextToString(asset.AssetFormat),
			Filename:    pgTextToString(asset.Filename),
			Description: pgTextToString(asset.Description),
			Tags:        tags,
			Metadata:    metadataStr,
			CreatedAt:   pgTimestamptzToString(asset.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(asset.UpdatedAt),
		}
		pbAssets = append(pbAssets, pbAsset)
	}

	return connect.NewResponse(&storyboardv1.ListProjectAssetsResponse{
		Assets: pbAssets,
	}), nil
}

// GetProjectAsset retrieves a project asset by ID
func (s *StoryboardService) GetProjectAsset(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProjectAssetRequest],
) (*connect.Response[storyboardv1.ProjectAsset], error) {
	assetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	asset, err := s.queries.GetProjectAsset(ctx, sqlc.GetProjectAssetParams{
		ID:    uuidToPgUUID(assetID),
		OrgID: orgIDPg,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	tags := make([]string, 0)
	if asset.Tags != nil {
		tags = asset.Tags
	}

	var metadataStr *string
	if asset.Metadata != nil && len(asset.Metadata) > 0 {
		metadataStr = stringPtr(string(asset.Metadata))
	}

	return connect.NewResponse(&storyboardv1.ProjectAsset{
		Id:          pgUUIDToString(asset.ID),
		ProjectId:   pgUUIDToString(asset.ProjectID),
		AssetType:   asset.AssetType,
		AssetFormat: pgTextToString(asset.AssetFormat),
		Filename:    pgTextToString(asset.Filename),
		Description: pgTextToString(asset.Description),
		Tags:        tags,
		Metadata:    metadataStr,
		CreatedAt:   pgTimestamptzToString(asset.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(asset.UpdatedAt),
	}), nil
}

// GetProjectAssetData retrieves project asset data as base64
func (s *StoryboardService) GetProjectAssetData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProjectAssetDataRequest],
) (*connect.Response[storyboardv1.GetProjectAssetDataResponse], error) {
	assetID, err := uuid.Parse(req.Msg.AssetId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	result, err := s.queries.GetProjectAssetData(ctx, sqlc.GetProjectAssetDataParams{
		ID:    uuidToPgUUID(assetID),
		OrgID: orgIDPg,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.AssetData)
	format := ""
	if result.AssetFormat.Valid {
		format = result.AssetFormat.String
	}

	return connect.NewResponse(&storyboardv1.GetProjectAssetDataResponse{
		AssetDataBase64: base64Data,
		AssetFormat:     format,
	}), nil
}

// CreateProjectAsset creates a new project asset
func (s *StoryboardService) CreateProjectAsset(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateProjectAssetRequest],
) (*connect.Response[storyboardv1.ProjectAsset], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Decode base64 asset data
	assetData, err := base64.StdEncoding.DecodeString(req.Msg.AssetDataBase64)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	// Convert tags
	var tagsStr []string
	if len(req.Msg.Tags) > 0 {
		tagsStr = req.Msg.Tags
	}

	// Parse metadata JSON if provided
	var metadataBytes []byte
	if req.Msg.Metadata != nil && *req.Msg.Metadata != "" {
		metadataBytes = []byte(*req.Msg.Metadata)
	}

	asset, err := s.queries.CreateProjectAsset(ctx, sqlc.CreateProjectAssetParams{
		ProjectID:   uuidToPgUUID(projectID),
		OrgID:       orgIDPg,
		AssetType:   req.Msg.AssetType,
		AssetData:   assetData,
		AssetFormat: stringToPgText(req.Msg.AssetFormat),
		Filename:    stringToPgText(req.Msg.Filename),
		Description: stringToPgText(req.Msg.Description),
		Tags:        tagsStr,
		Metadata:    metadataBytes,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	tags := make([]string, 0)
	if asset.Tags != nil {
		tags = asset.Tags
	}

	var metadataStr *string
	if asset.Metadata != nil && len(asset.Metadata) > 0 {
		metadataStr = stringPtr(string(asset.Metadata))
	}

	return connect.NewResponse(&storyboardv1.ProjectAsset{
		Id:          pgUUIDToString(asset.ID),
		ProjectId:   pgUUIDToString(asset.ProjectID),
		AssetType:   asset.AssetType,
		AssetFormat: pgTextToString(asset.AssetFormat),
		Filename:    pgTextToString(asset.Filename),
		Description: pgTextToString(asset.Description),
		Tags:        tags,
		Metadata:    metadataStr,
		CreatedAt:   pgTimestamptzToString(asset.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(asset.UpdatedAt),
	}), nil
}

// UpdateProjectAsset updates an existing project asset
func (s *StoryboardService) UpdateProjectAsset(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateProjectAssetRequest],
) (*connect.Response[storyboardv1.ProjectAsset], error) {
	assetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	// Convert tags
	var tagsStr []string
	if len(req.Msg.Tags) > 0 {
		tagsStr = req.Msg.Tags
	}

	// Parse metadata JSON if provided
	var metadataBytes []byte
	if req.Msg.Metadata != nil && *req.Msg.Metadata != "" {
		metadataBytes = []byte(*req.Msg.Metadata)
	}

	asset, err := s.queries.UpdateProjectAsset(ctx, sqlc.UpdateProjectAssetParams{
		ID:          uuidToPgUUID(assetID),
		OrgID:       orgIDPg,
		Filename:    stringToPgText(req.Msg.Filename),
		Description: stringToPgText(req.Msg.Description),
		Tags:        tagsStr,
		Metadata:    metadataBytes,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	tags := make([]string, 0)
	if asset.Tags != nil {
		tags = asset.Tags
	}

	var metadataStr *string
	if asset.Metadata != nil && len(asset.Metadata) > 0 {
		metadataStr = stringPtr(string(asset.Metadata))
	}

	return connect.NewResponse(&storyboardv1.ProjectAsset{
		Id:          pgUUIDToString(asset.ID),
		ProjectId:   pgUUIDToString(asset.ProjectID),
		AssetType:   asset.AssetType,
		AssetFormat: pgTextToString(asset.AssetFormat),
		Filename:    pgTextToString(asset.Filename),
		Description: pgTextToString(asset.Description),
		Tags:        tags,
		Metadata:    metadataStr,
		CreatedAt:   pgTimestamptzToString(asset.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(asset.UpdatedAt),
	}), nil
}

// DeleteProjectAsset deletes a project asset
func (s *StoryboardService) DeleteProjectAsset(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteProjectAssetRequest],
) (*connect.Response[storyboardv1.DeleteProjectAssetResponse], error) {
	assetID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.DeleteProjectAsset(ctx, sqlc.DeleteProjectAssetParams{
		ID:    uuidToPgUUID(assetID),
		OrgID: orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteProjectAssetResponse{
		Success: true,
	}), nil
}
