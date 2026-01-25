package service

import (
	"context"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
)

// ListTags lists tags for a project
func (s *StoryboardService) ListTags(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListTagsRequest],
) (*connect.Response[storyboardv1.ListTagsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	tags, err := s.queries.ListTags(ctx, sqlc.ListTagsParams{
		ProjectID: uuidToPgUUID(projectID),
		OrgID:     orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbTags := make([]*storyboardv1.Tag, 0, len(tags))
	for _, tag := range tags {
		pbTags = append(pbTags, &storyboardv1.Tag{
			Id:        pgUUIDToString(tag.ID),
			ProjectId: pgUUIDToString(tag.ProjectID),
			Name:      tag.Name,
			Color:     pgTextToString(tag.Color),
			CreatedAt: pgTimestamptzToString(tag.CreatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListTagsResponse{
		Tags: pbTags,
	}), nil
}

// GetTag retrieves a tag by ID
func (s *StoryboardService) GetTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetTagRequest],
) (*connect.Response[storyboardv1.Tag], error) {
	tagID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	tag, err := s.queries.GetTag(ctx, sqlc.GetTagParams{
		ID:    uuidToPgUUID(tagID),
		OrgID: orgIDPg,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Tag{
		Id:        pgUUIDToString(tag.ID),
		ProjectId: pgUUIDToString(tag.ProjectID),
		Name:      tag.Name,
		Color:     pgTextToString(tag.Color),
		CreatedAt: pgTimestamptzToString(tag.CreatedAt),
	}), nil
}

// CreateTag creates a new tag
func (s *StoryboardService) CreateTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateTagRequest],
) (*connect.Response[storyboardv1.Tag], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	tag, err := s.queries.CreateTag(ctx, sqlc.CreateTagParams{
		ProjectID: uuidToPgUUID(projectID),
		OrgID:     orgIDPg,
		Name:      req.Msg.Name,
		Color:     stringToPgText(req.Msg.Color),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Tag{
		Id:        pgUUIDToString(tag.ID),
		ProjectId: pgUUIDToString(tag.ProjectID),
		Name:      tag.Name,
		Color:     pgTextToString(tag.Color),
		CreatedAt: pgTimestamptzToString(tag.CreatedAt),
	}), nil
}

// UpdateTag updates an existing tag
func (s *StoryboardService) UpdateTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateTagRequest],
) (*connect.Response[storyboardv1.Tag], error) {
	tagID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	name := ""
	if req.Msg.Name != nil {
		name = *req.Msg.Name
	}

	tag, err := s.queries.UpdateTag(ctx, sqlc.UpdateTagParams{
		ID:    uuidToPgUUID(tagID),
		OrgID: orgIDPg,
		Name:  name,
		Color: stringToPgText(req.Msg.Color),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Tag{
		Id:        pgUUIDToString(tag.ID),
		ProjectId: pgUUIDToString(tag.ProjectID),
		Name:      tag.Name,
		Color:     pgTextToString(tag.Color),
		CreatedAt: pgTimestamptzToString(tag.CreatedAt),
	}), nil
}

// DeleteTag deletes a tag
func (s *StoryboardService) DeleteTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteTagRequest],
) (*connect.Response[storyboardv1.DeleteTagResponse], error) {
	tagID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.DeleteTag(ctx, sqlc.DeleteTagParams{
		ID:    uuidToPgUUID(tagID),
		OrgID: orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteTagResponse{
		Success: true,
	}), nil
}

// ListResourceTags lists tags for a resource
func (s *StoryboardService) ListResourceTags(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListResourceTagsRequest],
) (*connect.Response[storyboardv1.ListResourceTagsResponse], error) {
	resourceID, err := uuid.Parse(req.Msg.ResourceId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	tags, err := s.queries.ListResourceTags(ctx, sqlc.ListResourceTagsParams{
		ResourceType: req.Msg.ResourceType,
		ResourceID:   uuidToPgUUID(resourceID),
		OrgID:        orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbTags := make([]*storyboardv1.Tag, 0, len(tags))
	for _, tag := range tags {
		pbTags = append(pbTags, &storyboardv1.Tag{
			Id:        pgUUIDToString(tag.ID),
			ProjectId: pgUUIDToString(tag.ProjectID),
			Name:      tag.Name,
			Color:     pgTextToString(tag.Color),
			CreatedAt: pgTimestamptzToString(tag.CreatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListResourceTagsResponse{
		Tags: pbTags,
	}), nil
}

// AddResourceTag adds a tag to a resource
func (s *StoryboardService) AddResourceTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.AddResourceTagRequest],
) (*connect.Response[storyboardv1.ResourceTag], error) {
	resourceID, err := uuid.Parse(req.Msg.ResourceId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	tagID, err := uuid.Parse(req.Msg.TagId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.AddResourceTag(ctx, sqlc.AddResourceTagParams{
		ResourceType: req.Msg.ResourceType,
		ResourceID:   uuidToPgUUID(resourceID),
		TagID:        uuidToPgUUID(tagID),
		OrgID:        orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.ResourceTag{
		ResourceType: req.Msg.ResourceType,
		ResourceId:   req.Msg.ResourceId,
		TagId:        req.Msg.TagId,
	}), nil
}

// RemoveResourceTag removes a tag from a resource
func (s *StoryboardService) RemoveResourceTag(
	ctx context.Context,
	req *connect.Request[storyboardv1.RemoveResourceTagRequest],
) (*connect.Response[storyboardv1.RemoveResourceTagResponse], error) {
	resourceID, err := uuid.Parse(req.Msg.ResourceId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	tagID, err := uuid.Parse(req.Msg.TagId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	err = s.queries.RemoveResourceTag(ctx, sqlc.RemoveResourceTagParams{
		ResourceType: req.Msg.ResourceType,
		ResourceID:   uuidToPgUUID(resourceID),
		TagID:        uuidToPgUUID(tagID),
		OrgID:        orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.RemoveResourceTagResponse{
		Success: true,
	}), nil
}
