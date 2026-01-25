package service

import (
	"context"
	"encoding/base64"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	storyboardv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1/storyboardv1connect"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/services"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.temporal.io/sdk/client"
)

// StoryboardService implements the StoryboardService gRPC service
type StoryboardService struct {
	db             *pgxpool.Pool
	queries        *sqlc.Queries
	temporalClient client.Client
	hume           *services.HumeService
	openai         *services.OpenAIService
	suno           *services.SunoService
	runway         *services.RunwayService
}

// NewStoryboardService creates a new StoryboardService
func NewStoryboardService(pool *pgxpool.Pool, temporalClient client.Client) (*StoryboardService, error) {
	queries := sqlc.New(pool)

	hume, err := services.NewHumeService()
	if err != nil {
		// Hume service is optional
		hume = nil
	}

	openai, err := services.NewOpenAIService()
	if err != nil {
		// OpenAI service is optional
		openai = nil
	}

	suno, err := services.NewSunoService()
	if err != nil {
		// Suno service is optional
		suno = nil
	}

	runway, err := services.NewRunwayService()
	if err != nil {
		// Runway service is optional
		runway = nil
	}

	return &StoryboardService{
		db:             pool,
		queries:        queries,
		temporalClient: temporalClient,
		hume:           hume,
		openai:         openai,
		suno:           suno,
		runway:         runway,
	}, nil
}

// ListProjects lists all projects for the authenticated organization
func (s *StoryboardService) ListProjects(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListProjectsRequest],
) (*connect.Response[storyboardv1.ListProjectsResponse], error) {
	orgID := auth.GetOrgIDFromContext(ctx)

	var projects []sqlc.ListProjectsByOrgRow
	var err error

	if orgID != "" {
		projects, err = s.queries.ListProjectsByOrg(ctx, stringToPgText(&orgID))
	} else {
		// List all projects when no org filter
		allProjects, listErr := s.queries.ListProjects(ctx, "")
		if listErr != nil {
			return nil, connect.NewError(connect.CodeInternal, listErr)
		}
		// Convert ListProjectsRow to ListProjectsByOrgRow format
		projects = make([]sqlc.ListProjectsByOrgRow, 0, len(allProjects))
		for _, p := range allProjects {
			projects = append(projects, sqlc.ListProjectsByOrgRow{
				ID:          p.ID,
				Title:       p.Title,
				Description: p.Description,
				CreatedAt:   p.CreatedAt,
				UpdatedAt:   p.UpdatedAt,
			})
		}
		err = nil
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbProjects := make([]*storyboardv1.Project, 0, len(projects))
	for _, p := range projects {
		pbProjects = append(pbProjects, &storyboardv1.Project{
			Id:          pgUUIDToString(p.ID),
			Title:       p.Title,
			Description: pgTextToString(p.Description),
			CreatedAt:   pgTimestamptzToString(p.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(p.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListProjectsResponse{
		Projects: pbProjects,
	}), nil
}

// GetProject retrieves a project by ID
func (s *StoryboardService) GetProject(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetProjectRequest],
) (*connect.Response[storyboardv1.Project], error) {
	projectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	project, err := s.queries.GetProject(ctx, uuidToPgUUID(projectID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Project{
		Id:          pgUUIDToString(project.ID),
		Title:       project.Title,
		Description: pgTextToString(project.Description),
		CreatedAt:   pgTimestamptzToString(project.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(project.UpdatedAt),
	}), nil
}

// CreateProject creates a new project
func (s *StoryboardService) CreateProject(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateProjectRequest],
) (*connect.Response[storyboardv1.Project], error) {
	orgID := auth.GetOrgIDFromContext(ctx)

	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	project, err := s.queries.CreateProject(ctx, sqlc.CreateProjectParams{
		Title:       req.Msg.Title,
		Description: stringToPgText(req.Msg.Description),
		OrgID:       orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Project{
		Id:          pgUUIDToString(project.ID),
		Title:       project.Title,
		Description: pgTextToString(project.Description),
		CreatedAt:   pgTimestamptzToString(project.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(project.UpdatedAt),
	}), nil
}

// UpdateProject updates an existing project
func (s *StoryboardService) UpdateProject(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateProjectRequest],
) (*connect.Response[storyboardv1.Project], error) {
	projectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}
	project, err := s.queries.UpdateProject(ctx, sqlc.UpdateProjectParams{
		ID:          uuidToPgUUID(projectID),
		Title:       title,
		Description: stringToPgText(req.Msg.Description),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.Project{
		Id:          pgUUIDToString(project.ID),
		Title:       project.Title,
		Description: pgTextToString(project.Description),
		CreatedAt:   pgTimestamptzToString(project.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(project.UpdatedAt),
	}), nil
}

// DeleteProject deletes a project
func (s *StoryboardService) DeleteProject(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteProjectRequest],
) (*connect.Response[storyboardv1.DeleteProjectResponse], error) {
	projectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteProject(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteProjectResponse{
		Success: true,
	}), nil
}

// ListStoryboards lists storyboards for a project
func (s *StoryboardService) ListStoryboards(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListStoryboardsRequest],
) (*connect.Response[storyboardv1.ListStoryboardsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	storyboards, err := s.queries.ListStoryboards(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbStoryboards := make([]*storyboardv1.Storyboard, 0, len(storyboards))
	for _, sb := range storyboards {
		var durSec *int32
		if sb.DurationSeconds.Valid {
			durSec = int32Ptr(int32(sb.DurationSeconds.Int32))
		}
		aspectRatio := ""
		if sb.AspectRatio.Valid {
			aspectRatio = sb.AspectRatio.String
		}
		resolution := ""
		if sb.Resolution.Valid {
			resolution = sb.Resolution.String
		}
		pbStoryboards = append(pbStoryboards, &storyboardv1.Storyboard{
			Id:              pgUUIDToString(sb.ID),
			ProjectId:       pgUUIDToString(sb.ProjectID),
			Title:           sb.Title,
			AspectRatio:     aspectRatio,
			Resolution:      resolution,
			DurationSeconds: durSec,
			NumVariations:   int32(sb.NumVariations.Int32),
			CreatedAt:       pgTimestamptzToString(sb.CreatedAt),
			UpdatedAt:       pgTimestamptzToString(sb.UpdatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListStoryboardsResponse{
		Storyboards: pbStoryboards,
	}), nil
}

// GetStoryboard retrieves a storyboard by ID
func (s *StoryboardService) GetStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetStoryboardRequest],
) (*connect.Response[storyboardv1.Storyboard], error) {
	storyboardID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	sb, err := s.queries.GetStoryboard(ctx, uuidToPgUUID(storyboardID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var durSec *int32
	if sb.DurationSeconds.Valid {
		durSec = int32Ptr(int32(sb.DurationSeconds.Int32))
	}
	aspectRatio := ""
	if sb.AspectRatio.Valid {
		aspectRatio = sb.AspectRatio.String
	}
	resolution := ""
	if sb.Resolution.Valid {
		resolution = sb.Resolution.String
	}

	return connect.NewResponse(&storyboardv1.Storyboard{
		Id:              pgUUIDToString(sb.ID),
		ProjectId:       pgUUIDToString(sb.ProjectID),
		Title:           sb.Title,
		AspectRatio:     aspectRatio,
		Resolution:      resolution,
		DurationSeconds: durSec,
		NumVariations:   int32(sb.NumVariations.Int32),
		CreatedAt:       pgTimestamptzToString(sb.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(sb.UpdatedAt),
	}), nil
}

// CreateStoryboard creates a new storyboard
func (s *StoryboardService) CreateStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateStoryboardRequest],
) (*connect.Response[storyboardv1.Storyboard], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	aspectRatio := "16:9"
	if req.Msg.AspectRatio != nil {
		aspectRatio = *req.Msg.AspectRatio
	}

	resolution := "1920x1080"
	if req.Msg.Resolution != nil {
		resolution = *req.Msg.Resolution
	}

	numVariations := int32(1)
	if req.Msg.NumVariations != nil {
		numVariations = *req.Msg.NumVariations
	}

	var durSecPg pgtype.Int4
	if req.Msg.DurationSeconds != nil {
		durSecPg = int32ToPgInt4(req.Msg.DurationSeconds)
	}

	sb, err := s.queries.CreateStoryboard(ctx, sqlc.CreateStoryboardParams{
		ProjectID:       uuidToPgUUID(projectID),
		Title:           req.Msg.Title,
		AspectRatio:     stringToPgText(&aspectRatio),
		Resolution:      stringToPgText(&resolution),
		DurationSeconds: durSecPg,
		NumVariations:   int32ToPgInt4(&numVariations),
		OrgID:           orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var durSec *int32
	if sb.DurationSeconds.Valid {
		durSec = int32Ptr(int32(sb.DurationSeconds.Int32))
	}

	aspectRatioResp := ""
	if sb.AspectRatio.Valid {
		aspectRatioResp = sb.AspectRatio.String
	}
	resolutionResp := ""
	if sb.Resolution.Valid {
		resolutionResp = sb.Resolution.String
	}

	return connect.NewResponse(&storyboardv1.Storyboard{
		Id:              pgUUIDToString(sb.ID),
		ProjectId:       pgUUIDToString(sb.ProjectID),
		Title:           sb.Title,
		AspectRatio:     aspectRatioResp,
		Resolution:      resolutionResp,
		DurationSeconds: durSec,
		NumVariations:   int32(sb.NumVariations.Int32),
		CreatedAt:       pgTimestamptzToString(sb.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(sb.UpdatedAt),
	}), nil
}

// UpdateStoryboard updates an existing storyboard
func (s *StoryboardService) UpdateStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateStoryboardRequest],
) (*connect.Response[storyboardv1.Storyboard], error) {
	storyboardID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}
	sb, err := s.queries.UpdateStoryboard(ctx, sqlc.UpdateStoryboardParams{
		ID:              uuidToPgUUID(storyboardID),
		Title:           title,
		AspectRatio:     stringToPgText(req.Msg.AspectRatio),
		Resolution:      stringToPgText(req.Msg.Resolution),
		DurationSeconds: int32ToPgInt4(req.Msg.DurationSeconds),
		NumVariations:   int32ToPgInt4(req.Msg.NumVariations),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var durSec2 *int32
	if sb.DurationSeconds.Valid {
		durSec2 = int32Ptr(int32(sb.DurationSeconds.Int32))
	}

	aspectRatio2 := ""
	if sb.AspectRatio.Valid {
		aspectRatio2 = sb.AspectRatio.String
	}
	resolution2 := ""
	if sb.Resolution.Valid {
		resolution2 = sb.Resolution.String
	}

	return connect.NewResponse(&storyboardv1.Storyboard{
		Id:              pgUUIDToString(sb.ID),
		ProjectId:       pgUUIDToString(sb.ProjectID),
		Title:           sb.Title,
		AspectRatio:     aspectRatio2,
		Resolution:      resolution2,
		DurationSeconds: durSec2,
		NumVariations:   int32(sb.NumVariations.Int32),
		CreatedAt:       pgTimestamptzToString(sb.CreatedAt),
		UpdatedAt:       pgTimestamptzToString(sb.UpdatedAt),
	}), nil
}

// DeleteStoryboard deletes a storyboard
func (s *StoryboardService) DeleteStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteStoryboardRequest],
) (*connect.Response[storyboardv1.DeleteStoryboardResponse], error) {
	storyboardID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteStoryboard(ctx, uuidToPgUUID(storyboardID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteStoryboardResponse{
		Success: true,
	}), nil
}

// ListScenes lists scenes for a storyboard
func (s *StoryboardService) ListScenes(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListScenesRequest],
) (*connect.Response[storyboardv1.ListScenesResponse], error) {
	storyboardID, err := uuid.Parse(req.Msg.StoryboardId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scenes, err := s.queries.ListScenes(ctx, uuidToPgUUID(storyboardID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbScenes := make([]*storyboardv1.Scene, 0, len(scenes))
	for _, scene := range scenes {
		pbScenes = append(pbScenes, convertListScenesRowToProto(scene))
	}

	return connect.NewResponse(&storyboardv1.ListScenesResponse{
		Scenes: pbScenes,
	}), nil
}

// GetScene retrieves a scene by ID
func (s *StoryboardService) GetScene(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetSceneRequest],
) (*connect.Response[storyboardv1.Scene], error) {
	sceneID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scene, err := s.queries.GetScene(ctx, uuidToPgUUID(sceneID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertGetSceneRowToProto(scene)), nil
}

// CreateScene creates a new scene
func (s *StoryboardService) CreateScene(
	ctx context.Context,
	req *connect.Request[storyboardv1.CreateSceneRequest],
) (*connect.Response[storyboardv1.Scene], error) {
	storyboardID, err := uuid.Parse(req.Msg.StoryboardId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)
	orgIDPg := stringToPgText(&orgID)

	textDescription := ""
	if req.Msg.TextDescription != nil {
		textDescription = *req.Msg.TextDescription
	}
	mediaType := ""
	if req.Msg.MediaType != nil {
		mediaType = *req.Msg.MediaType
	}
	transitionType := ""
	if req.Msg.TransitionType != nil {
		transitionType = *req.Msg.TransitionType
	}

	scene, err := s.queries.CreateScene(ctx, sqlc.CreateSceneParams{
		StoryboardID:    uuidToPgUUID(storyboardID),
		SceneNumber:     int32(req.Msg.SceneNumber),
		TextDescription: stringToPgText(&textDescription),
		MediaType:       stringToPgText(&mediaType),
		TransitionType:  stringToPgText(&transitionType),
		OrgID:           orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertCreateSceneRowToProto(scene)), nil
}

// UpdateScene updates an existing scene
func (s *StoryboardService) UpdateScene(
	ctx context.Context,
	req *connect.Request[storyboardv1.UpdateSceneRequest],
) (*connect.Response[storyboardv1.Scene], error) {
	sceneID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	scene, err := s.queries.UpdateScene(ctx, sqlc.UpdateSceneParams{
		ID:               uuidToPgUUID(sceneID),
		TextDescription:  stringToPgText(req.Msg.TextDescription),
		MediaType:        stringToPgText(req.Msg.MediaType),
		StartTimeSeconds: float64ToPgNumeric(req.Msg.StartTimeSeconds),
		DurationSeconds:  float64ToPgNumeric(req.Msg.DurationSeconds),
		TransitionType:   stringToPgText(req.Msg.TransitionType),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(convertUpdateSceneRowToProto(scene)), nil
}

// DeleteScene deletes a scene
func (s *StoryboardService) DeleteScene(
	ctx context.Context,
	req *connect.Request[storyboardv1.DeleteSceneRequest],
) (*connect.Response[storyboardv1.DeleteSceneResponse], error) {
	sceneID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteScene(ctx, uuidToPgUUID(sceneID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&storyboardv1.DeleteSceneResponse{
		Success: true,
	}), nil
}

// ListGeneratedImages lists generated images for a scene
func (s *StoryboardService) ListGeneratedImages(
	ctx context.Context,
	req *connect.Request[storyboardv1.ListGeneratedImagesRequest],
) (*connect.Response[storyboardv1.ListGeneratedImagesResponse], error) {
	sceneID, err := uuid.Parse(req.Msg.SceneId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	images, err := s.queries.ListGeneratedImages(ctx, uuidToPgUUID(sceneID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbImages := make([]*storyboardv1.GeneratedImage, 0, len(images))
	for _, img := range images {
		var sceneIDStr *string
		if img.SceneID.Valid {
			s := pgUUIDToString(img.SceneID)
			sceneIDStr = &s
		}
		var characterIDStr *string
		if img.CharacterID.Valid {
			c := pgUUIDToString(img.CharacterID)
			characterIDStr = &c
		}
		pbImages = append(pbImages, &storyboardv1.GeneratedImage{
			Id:              pgUUIDToString(img.ID),
			SceneId:         sceneIDStr,
			Provider:        pgTextToString(img.Provider),
			ExternalImageId: pgTextToString(img.ExternalImageID),
			ImageFormat:     pgTextToString(img.ImageFormat),
			ImageType:       pgTextToString(img.ImageType),
			Prompt:          pgTextToString(img.Prompt),
			Model:           pgTextToString(img.Model),
			CharacterId:     characterIDStr,
			CreatedAt:       pgTimestamptzToString(img.CreatedAt),
		})
	}

	return connect.NewResponse(&storyboardv1.ListGeneratedImagesResponse{
		Images: pbImages,
	}), nil
}

// GetImageData retrieves image data as base64
func (s *StoryboardService) GetImageData(
	ctx context.Context,
	req *connect.Request[storyboardv1.GetImageDataRequest],
) (*connect.Response[storyboardv1.GetImageDataResponse], error) {
	imageID, err := uuid.Parse(req.Msg.ImageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	result, err := s.queries.GetGeneratedImageData(ctx, uuidToPgUUID(imageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	base64Data := base64.StdEncoding.EncodeToString(result.ImageData)

	return connect.NewResponse(&storyboardv1.GetImageDataResponse{
		ImageDataBase64: base64Data,
	}), nil
}

// GenerateImage generates an image using OpenAI via Temporal workflow
func (s *StoryboardService) GenerateImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateImageRequest],
) (*connect.Response[storyboardv1.GenerateImageResponse], error) {
	sceneID, err := uuid.Parse(req.Msg.SceneId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	model := "dall-e-3"
	if req.Msg.Model != nil {
		model = *req.Msg.Model
	}

	provider := "openai"
	if req.Msg.Provider != nil {
		provider = *req.Msg.Provider
	}

	var characterID string
	if req.Msg.CharacterId != nil {
		characterID = *req.Msg.CharacterId
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Start Temporal workflow for image generation
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("image-gen-%s-%s", sceneID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ImageGenerationWorkflow, workflows.ImageGenerationWorkflowInput{
		SceneID:     sceneID.String(),
		Prompt:      req.Msg.Prompt,
		Model:       model,
		Provider:    provider,
		OrgID:       orgID,
		CharacterID: characterID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete (with timeout)
	var result workflows.ImageGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Query the generated image from database using the image ID from workflow result
	imageUUID, err := uuid.Parse(result.ImageID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	image, err := s.queries.GetGeneratedImage(ctx, uuidToPgUUID(imageUUID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var sceneIDStr *string
	if image.SceneID.Valid {
		s := pgUUIDToString(image.SceneID)
		sceneIDStr = &s
	}
	var characterIDStr *string
	if image.CharacterID.Valid {
		c := pgUUIDToString(image.CharacterID)
		characterIDStr = &c
	}

	return connect.NewResponse(&storyboardv1.GenerateImageResponse{
		Image: &storyboardv1.GeneratedImage{
			Id:              pgUUIDToString(image.ID),
			SceneId:         sceneIDStr,
			Provider:        pgTextToString(image.Provider),
			ExternalImageId: pgTextToString(image.ExternalImageID),
			ImageFormat:     pgTextToString(image.ImageFormat),
			ImageType:       pgTextToString(image.ImageType),
			Prompt:          pgTextToString(image.Prompt),
			Model:           pgTextToString(image.Model),
			CharacterId:     characterIDStr,
			CreatedAt:       pgTimestamptzToString(image.CreatedAt),
		},
	}), nil
}

// GenerateCharacterImage generates a character image using Higgsfield Soul ID via Temporal workflow
func (s *StoryboardService) GenerateCharacterImage(
	ctx context.Context,
	req *connect.Request[storyboardv1.GenerateCharacterImageRequest],
) (*connect.Response[storyboardv1.GenerateCharacterImageResponse], error) {
	characterID, err := uuid.Parse(req.Msg.CharacterId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	style := ""
	if req.Msg.Style != nil {
		style = *req.Msg.Style
	}

	aspectRatio := ""
	if req.Msg.AspectRatio != nil {
		aspectRatio = *req.Msg.AspectRatio
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Start Temporal workflow for character image generation
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("char-image-gen-%s-%s", characterID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.CharacterImageGenerationWorkflow, workflows.CharacterImageGenerationWorkflowInput{
		CharacterID: characterID.String(),
		Prompt:      req.Msg.Prompt,
		Style:       style,
		AspectRatio: aspectRatio,
		OrgID:       orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete (with timeout)
	var result workflows.ImageGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Query the generated image from database using the image ID from workflow result
	imageUUID, err := uuid.Parse(result.ImageID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	image, err := s.queries.GetGeneratedImage(ctx, uuidToPgUUID(imageUUID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var sceneIDStr *string
	if image.SceneID.Valid {
		s := pgUUIDToString(image.SceneID)
		sceneIDStr = &s
	}
	var characterIDStr *string
	if image.CharacterID.Valid {
		c := pgUUIDToString(image.CharacterID)
		characterIDStr = &c
	}

	return connect.NewResponse(&storyboardv1.GenerateCharacterImageResponse{
		Image: &storyboardv1.GeneratedImage{
			Id:              pgUUIDToString(image.ID),
			SceneId:         sceneIDStr,
			Provider:        pgTextToString(image.Provider),
			ExternalImageId: pgTextToString(image.ExternalImageID),
			ImageFormat:     pgTextToString(image.ImageFormat),
			ImageType:       pgTextToString(image.ImageType),
			Prompt:          pgTextToString(image.Prompt),
			Model:           pgTextToString(image.Model),
			CharacterId:     characterIDStr,
			CreatedAt:       pgTimestamptzToString(image.CreatedAt),
		},
	}), nil
}

// Helper functions

func convertSceneToProto(scene sqlc.Scene) *storyboardv1.Scene {
	return &storyboardv1.Scene{
		Id:               pgUUIDToString(scene.ID),
		StoryboardId:     pgUUIDToString(scene.StoryboardID),
		SceneNumber:      int32(scene.SceneNumber),
		TextDescription:  pgTextToString(scene.TextDescription),
		MediaType:        pgTextToString(scene.MediaType),
		MediaUrl:         pgTextToString(scene.MediaUrl),
		StartTimeSeconds: pgNumericToFloat64(scene.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(scene.DurationSeconds),
		TransitionType:   pgTextToString(scene.TransitionType),
		CreatedAt:        pgTimestamptzToString(scene.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(scene.UpdatedAt),
	}
}

func convertListScenesRowToProto(scene sqlc.ListScenesRow) *storyboardv1.Scene {
	return &storyboardv1.Scene{
		Id:               pgUUIDToString(scene.ID),
		StoryboardId:     pgUUIDToString(scene.StoryboardID),
		SceneNumber:      scene.SceneNumber,
		TextDescription:  pgTextToString(scene.TextDescription),
		MediaType:        pgTextToString(scene.MediaType),
		MediaUrl:         pgTextToString(scene.MediaUrl),
		StartTimeSeconds: pgNumericToFloat64(scene.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(scene.DurationSeconds),
		TransitionType:   pgTextToString(scene.TransitionType),
		CreatedAt:        pgTimestamptzToString(scene.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(scene.CreatedAt), // UpdatedAt not in ListScenesRow
	}
}

func convertGetSceneRowToProto(scene sqlc.GetSceneRow) *storyboardv1.Scene {
	return &storyboardv1.Scene{
		Id:               pgUUIDToString(scene.ID),
		StoryboardId:     pgUUIDToString(scene.StoryboardID),
		SceneNumber:      scene.SceneNumber,
		TextDescription:  pgTextToString(scene.TextDescription),
		MediaType:        pgTextToString(scene.MediaType),
		MediaUrl:         pgTextToString(scene.MediaUrl),
		StartTimeSeconds: pgNumericToFloat64(scene.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(scene.DurationSeconds),
		TransitionType:   pgTextToString(scene.TransitionType),
		CreatedAt:        pgTimestamptzToString(scene.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(scene.CreatedAt), // UpdatedAt not in GetSceneRow
	}
}

func convertCreateSceneRowToProto(scene sqlc.CreateSceneRow) *storyboardv1.Scene {
	return &storyboardv1.Scene{
		Id:               pgUUIDToString(scene.ID),
		StoryboardId:     pgUUIDToString(scene.StoryboardID),
		SceneNumber:      scene.SceneNumber,
		TextDescription:  pgTextToString(scene.TextDescription),
		MediaType:        pgTextToString(scene.MediaType),
		MediaUrl:         pgTextToString(scene.MediaUrl),
		StartTimeSeconds: pgNumericToFloat64(scene.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(scene.DurationSeconds),
		TransitionType:   pgTextToString(scene.TransitionType),
		CreatedAt:        pgTimestamptzToString(scene.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(scene.CreatedAt), // UpdatedAt not in CreateSceneRow
	}
}

func convertUpdateSceneRowToProto(scene sqlc.UpdateSceneRow) *storyboardv1.Scene {
	return &storyboardv1.Scene{
		Id:               pgUUIDToString(scene.ID),
		StoryboardId:     pgUUIDToString(scene.StoryboardID),
		SceneNumber:      scene.SceneNumber,
		TextDescription:  pgTextToString(scene.TextDescription),
		MediaType:        pgTextToString(scene.MediaType),
		MediaUrl:         pgTextToString(scene.MediaUrl),
		StartTimeSeconds: pgNumericToFloat64(scene.StartTimeSeconds),
		DurationSeconds:  pgNumericToFloat64(scene.DurationSeconds),
		TransitionType:   pgTextToString(scene.TransitionType),
		CreatedAt:        pgTimestamptzToString(scene.CreatedAt),
		UpdatedAt:        pgTimestamptzToString(scene.UpdatedAt),
	}
}

// Ensure StoryboardService implements the service interface
var _ storyboardv1connect.StoryboardServiceHandler = (*StoryboardService)(nil)
