package service

import (
	"context"
	"encoding/base64"
	"fmt"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db/sqlc"
	novelv1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/novel/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/services"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
	"go.temporal.io/sdk/client"
)

// NovelService implements the NovelService gRPC service
type NovelService struct {
	db             *pgxpool.Pool
	queries        *sqlc.Queries
	temporalClient client.Client
	hume           *services.HumeService
	openai         *services.OpenAIService
}

// NewNovelService creates a new NovelService
func NewNovelService(pool *pgxpool.Pool, temporalClient client.Client) (*NovelService, error) {
	queries := sqlc.New(pool)

	hume, err := services.NewHumeService()
	if err != nil {
		hume = nil
	}

	openai, err := services.NewOpenAIService()
	if err != nil {
		openai = nil
	}

	return &NovelService{
		db:             pool,
		queries:        queries,
		temporalClient: temporalClient,
		hume:           hume,
		openai:         openai,
	}, nil
}

// ListNovelProjects lists all novel projects for a project
func (s *NovelService) ListNovelProjects(
	ctx context.Context,
	req *connect.Request[novelv1.ListNovelProjectsRequest],
) (*connect.Response[novelv1.ListNovelProjectsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	novelProjects, err := s.queries.ListNovelProjectsByProjectId(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbProjects := make([]*novelv1.NovelProject, 0, len(novelProjects))
	for _, p := range novelProjects {
		pbProjects = append(pbProjects, &novelv1.NovelProject{
			Id:          pgUUIDToString(p.ID),
			ProjectId:   pgUUIDToString(p.ProjectID),
			Title:       p.Title,
			Description: pgTextToString(p.Description),
			Language:    *pgTextToString(p.Language),
			CreatedAt:   pgTimestamptzToString(p.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(p.UpdatedAt),
		})
	}

	return connect.NewResponse(&novelv1.ListNovelProjectsResponse{
		Projects: pbProjects,
	}), nil
}

// GetNovelProject retrieves a novel project by ID
func (s *NovelService) GetNovelProject(
	ctx context.Context,
	req *connect.Request[novelv1.GetNovelProjectRequest],
) (*connect.Response[novelv1.NovelProject], error) {
	novelProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	novelProject, err := s.queries.GetNovelProject(ctx, uuidToPgUUID(novelProjectID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.NovelProject{
		Id:          pgUUIDToString(novelProject.ID),
		ProjectId:   pgUUIDToString(novelProject.ProjectID),
		Title:       novelProject.Title,
		Description: pgTextToString(novelProject.Description),
		Language:    *pgTextToString(novelProject.Language),
		CreatedAt:   pgTimestamptzToString(novelProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(novelProject.UpdatedAt),
	}), nil
}

// CreateNovelProject creates a new novel project
func (s *NovelService) CreateNovelProject(
	ctx context.Context,
	req *connect.Request[novelv1.CreateNovelProjectRequest],
) (*connect.Response[novelv1.NovelProject], error) {
	orgID := auth.GetOrgIDFromContext(ctx)
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	language := "ja"
	if req.Msg.Language != nil {
		language = *req.Msg.Language
	}

	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	novelProject, err := s.queries.CreateNovelProject(ctx, sqlc.CreateNovelProjectParams{
		ProjectID:   uuidToPgUUID(projectID),
		Title:       req.Msg.Title,
		Description: stringToPgText(req.Msg.Description),
		Language:    stringToPgText(&language),
		OrgID:       orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.NovelProject{
		Id:          pgUUIDToString(novelProject.ID),
		ProjectId:   pgUUIDToString(novelProject.ProjectID),
		Title:       novelProject.Title,
		Description: pgTextToString(novelProject.Description),
		Language:    *pgTextToString(novelProject.Language),
		CreatedAt:   pgTimestamptzToString(novelProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(novelProject.UpdatedAt),
	}), nil
}

// UpdateNovelProject updates an existing novel project
func (s *NovelService) UpdateNovelProject(
	ctx context.Context,
	req *connect.Request[novelv1.UpdateNovelProjectRequest],
) (*connect.Response[novelv1.NovelProject], error) {
	novelProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}

	language := ""
	if req.Msg.Language != nil {
		language = *req.Msg.Language
	}

	novelProject, err := s.queries.UpdateNovelProject(ctx, sqlc.UpdateNovelProjectParams{
		ID:          uuidToPgUUID(novelProjectID),
		Title:       title,
		Description: stringToPgText(req.Msg.Description),
		Language:    stringToPgText(&language),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.NovelProject{
		Id:          pgUUIDToString(novelProject.ID),
		ProjectId:   pgUUIDToString(novelProject.ProjectID),
		Title:       novelProject.Title,
		Description: pgTextToString(novelProject.Description),
		Language:    *pgTextToString(novelProject.Language),
		CreatedAt:   pgTimestamptzToString(novelProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(novelProject.UpdatedAt),
	}), nil
}

// DeleteNovelProject deletes a novel project
func (s *NovelService) DeleteNovelProject(
	ctx context.Context,
	req *connect.Request[novelv1.DeleteNovelProjectRequest],
) (*connect.Response[novelv1.DeleteNovelProjectResponse], error) {
	novelProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteNovelProject(ctx, uuidToPgUUID(novelProjectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.DeleteNovelProjectResponse{
		Success: true,
	}), nil
}

// ListChapters lists all chapters for a novel project
func (s *NovelService) ListChapters(
	ctx context.Context,
	req *connect.Request[novelv1.ListChaptersRequest],
) (*connect.Response[novelv1.ListChaptersResponse], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	chapters, err := s.queries.ListNovelChapters(ctx, uuidToPgUUID(novelProjectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbChapters := make([]*novelv1.Chapter, 0, len(chapters))
	for _, ch := range chapters {
		pbChapters = append(pbChapters, &novelv1.Chapter{
			Id:             pgUUIDToString(ch.ID),
			NovelProjectId: pgUUIDToString(ch.NovelProjectID),
			Title:          ch.Title,
			OrderIndex:     ch.OrderIndex,
			ContentHtml:    pgTextToString(ch.ContentHtml),
			ContentJson:    pgTextToString(ch.ContentJson),
			CreatedAt:      pgTimestamptzToString(ch.CreatedAt),
			UpdatedAt:      pgTimestamptzToString(ch.UpdatedAt),
		})
	}

	return connect.NewResponse(&novelv1.ListChaptersResponse{
		Chapters: pbChapters,
	}), nil
}

// GetChapter retrieves a chapter by ID
func (s *NovelService) GetChapter(
	ctx context.Context,
	req *connect.Request[novelv1.GetChapterRequest],
) (*connect.Response[novelv1.Chapter], error) {
	chapterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	chapter, err := s.queries.GetNovelChapter(ctx, uuidToPgUUID(chapterID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.Chapter{
		Id:             pgUUIDToString(chapter.ID),
		NovelProjectId: pgUUIDToString(chapter.NovelProjectID),
		Title:          chapter.Title,
		OrderIndex:     chapter.OrderIndex,
		ContentHtml:    pgTextToString(chapter.ContentHtml),
		ContentJson:    pgTextToString(chapter.ContentJson),
		CreatedAt:      pgTimestamptzToString(chapter.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(chapter.UpdatedAt),
	}), nil
}

// CreateChapter creates a new chapter
func (s *NovelService) CreateChapter(
	ctx context.Context,
	req *connect.Request[novelv1.CreateChapterRequest],
) (*connect.Response[novelv1.Chapter], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	chapter, err := s.queries.CreateNovelChapter(ctx, sqlc.CreateNovelChapterParams{
		NovelProjectID: uuidToPgUUID(novelProjectID),
		Title:          req.Msg.Title,
		OrderIndex:     orderIndex,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.Chapter{
		Id:             pgUUIDToString(chapter.ID),
		NovelProjectId: pgUUIDToString(chapter.NovelProjectID),
		Title:          chapter.Title,
		OrderIndex:     chapter.OrderIndex,
		ContentHtml:    pgTextToString(chapter.ContentHtml),
		ContentJson:    pgTextToString(chapter.ContentJson),
		CreatedAt:      pgTimestamptzToString(chapter.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(chapter.UpdatedAt),
	}), nil
}

// UpdateChapter updates an existing chapter
func (s *NovelService) UpdateChapter(
	ctx context.Context,
	req *connect.Request[novelv1.UpdateChapterRequest],
) (*connect.Response[novelv1.Chapter], error) {
	chapterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	chapter, err := s.queries.UpdateNovelChapter(ctx, sqlc.UpdateNovelChapterParams{
		ID:         uuidToPgUUID(chapterID),
		Title:      title,
		OrderIndex: orderIndex,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.Chapter{
		Id:             pgUUIDToString(chapter.ID),
		NovelProjectId: pgUUIDToString(chapter.NovelProjectID),
		Title:          chapter.Title,
		OrderIndex:     chapter.OrderIndex,
		ContentHtml:    pgTextToString(chapter.ContentHtml),
		ContentJson:    pgTextToString(chapter.ContentJson),
		CreatedAt:      pgTimestamptzToString(chapter.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(chapter.UpdatedAt),
	}), nil
}

// DeleteChapter deletes a chapter
func (s *NovelService) DeleteChapter(
	ctx context.Context,
	req *connect.Request[novelv1.DeleteChapterRequest],
) (*connect.Response[novelv1.DeleteChapterResponse], error) {
	chapterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteNovelChapter(ctx, uuidToPgUUID(chapterID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.DeleteChapterResponse{
		Success: true,
	}), nil
}

// GetChapterContent retrieves chapter content
func (s *NovelService) GetChapterContent(
	ctx context.Context,
	req *connect.Request[novelv1.GetChapterContentRequest],
) (*connect.Response[novelv1.GetChapterContentResponse], error) {
	chapterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	chapter, err := s.queries.GetNovelChapter(ctx, uuidToPgUUID(chapterID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.GetChapterContentResponse{
		ContentHtml: pgTextToString(chapter.ContentHtml),
		ContentJson: pgTextToString(chapter.ContentJson),
	}), nil
}

// UpdateChapterContent updates chapter content
func (s *NovelService) UpdateChapterContent(
	ctx context.Context,
	req *connect.Request[novelv1.UpdateChapterContentRequest],
) (*connect.Response[novelv1.UpdateChapterContentResponse], error) {
	chapterID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.queries.UpdateNovelChapterContent(ctx, sqlc.UpdateNovelChapterContentParams{
		ID:          uuidToPgUUID(chapterID),
		ContentHtml: stringToPgText(req.Msg.ContentHtml),
		ContentJson: stringToPgText(req.Msg.ContentJson),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.UpdateChapterContentResponse{
		Success: true,
	}), nil
}

// ListJsonldNodes lists all JSON-LD nodes for a novel project
func (s *NovelService) ListJsonldNodes(
	ctx context.Context,
	req *connect.Request[novelv1.ListJsonldNodesRequest],
) (*connect.Response[novelv1.ListJsonldNodesResponse], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var nodeTypeFilter string
	if req.Msg.NodeType != nil && *req.Msg.NodeType != novelv1.JsonldNodeType_JSONLD_NODE_TYPE_UNSPECIFIED {
		nodeTypeFilter = req.Msg.NodeType.String()
	}

	nodes, err := s.queries.ListJsonldNodes(ctx, sqlc.ListJsonldNodesParams{
		NovelProjectID: uuidToPgUUID(novelProjectID),
		Column2:        nodeTypeFilter,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbNodes := make([]*novelv1.JsonldNode, 0, len(nodes))
	for _, n := range nodes {
		nodeTypeEnum := jsonldNodeTypeFromString(n.NodeType)
		attributesJSONStr := string(n.AttributesJson)
		pbNodes = append(pbNodes, &novelv1.JsonldNode{
			Id:             pgUUIDToString(n.ID),
			NovelProjectId: pgUUIDToString(n.NovelProjectID),
			NodeType:       nodeTypeEnum,
			Name:           n.Name,
			Description:    pgTextToString(n.Description),
			AttributesJson: &attributesJSONStr,
			ImageBase64:    pgTextToString(n.ImageBase64),
			CreatedAt:      pgTimestamptzToString(n.CreatedAt),
			UpdatedAt:      pgTimestamptzToString(n.UpdatedAt),
		})
	}

	return connect.NewResponse(&novelv1.ListJsonldNodesResponse{
		Nodes: pbNodes,
	}), nil
}

// GetJsonldNode retrieves a JSON-LD node by ID
func (s *NovelService) GetJsonldNode(
	ctx context.Context,
	req *connect.Request[novelv1.GetJsonldNodeRequest],
) (*connect.Response[novelv1.JsonldNode], error) {
	nodeID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	node, err := s.queries.GetJsonldNode(ctx, uuidToPgUUID(nodeID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	nodeTypeEnum := jsonldNodeTypeFromString(node.NodeType)
	attributesJSONStr := string(node.AttributesJson)
	return connect.NewResponse(&novelv1.JsonldNode{
		Id:             pgUUIDToString(node.ID),
		NovelProjectId: pgUUIDToString(node.NovelProjectID),
		NodeType:       nodeTypeEnum,
		Name:           node.Name,
		Description:    pgTextToString(node.Description),
		AttributesJson: &attributesJSONStr,
		ImageBase64:    pgTextToString(node.ImageBase64),
		CreatedAt:      pgTimestamptzToString(node.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(node.UpdatedAt),
	}), nil
}

// UpsertJsonldNode creates or updates a JSON-LD node
func (s *NovelService) UpsertJsonldNode(
	ctx context.Context,
	req *connect.Request[novelv1.UpsertJsonldNodeRequest],
) (*connect.Response[novelv1.JsonldNode], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var nodeID pgtype.UUID
	if req.Msg.Id != nil {
		parsedID, err := uuid.Parse(*req.Msg.Id)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, err)
		}
		nodeID = uuidToPgUUID(parsedID)
	}

	nodeTypeStr := req.Msg.NodeType.String()
	attributesJSON := ""
	if req.Msg.AttributesJson != nil {
		attributesJSON = *req.Msg.AttributesJson
	}

	var column1 interface{}
	if nodeID.Valid {
		column1 = nodeID
	}
	node, err := s.queries.UpsertJsonldNode(ctx, sqlc.UpsertJsonldNodeParams{
		Column1:        column1,
		NovelProjectID: uuidToPgUUID(novelProjectID),
		NodeType:       nodeTypeStr,
		Name:           req.Msg.Name,
		Description:    stringToPgText(req.Msg.Description),
		AttributesJson: []byte(attributesJSON),
		ImageBase64:    stringToPgText(req.Msg.ImageBase64),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	nodeTypeEnum := jsonldNodeTypeFromString(node.NodeType)
	attributesJSONStr := string(node.AttributesJson)
	return connect.NewResponse(&novelv1.JsonldNode{
		Id:             pgUUIDToString(node.ID),
		NovelProjectId: pgUUIDToString(node.NovelProjectID),
		NodeType:       nodeTypeEnum,
		Name:           node.Name,
		Description:    pgTextToString(node.Description),
		AttributesJson: &attributesJSONStr,
		ImageBase64:    pgTextToString(node.ImageBase64),
		CreatedAt:      pgTimestamptzToString(node.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(node.UpdatedAt),
	}), nil
}

// DeleteJsonldNode deletes a JSON-LD node
func (s *NovelService) DeleteJsonldNode(
	ctx context.Context,
	req *connect.Request[novelv1.DeleteJsonldNodeRequest],
) (*connect.Response[novelv1.DeleteJsonldNodeResponse], error) {
	nodeID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteJsonldNode(ctx, uuidToPgUUID(nodeID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.DeleteJsonldNodeResponse{
		Success: true,
	}), nil
}

// AnalyzeEmotions analyzes emotions for text content
// AnalyzeEmotions analyzes emotions in text using Hume AI via Temporal workflow
func (s *NovelService) AnalyzeEmotions(
	ctx context.Context,
	req *connect.Request[novelv1.AnalyzeEmotionsRequest],
) (*connect.Response[novelv1.AnalyzeEmotionsResponse], error) {
	nodeID, err := uuid.Parse(req.Msg.NodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Get node to get text
	node, err := s.queries.GetJsonldNode(ctx, uuidToPgUUID(nodeID))
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Start Temporal workflow for emotion analysis
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("emotion-analysis-%s-%s", nodeID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	// Extract text from JSON-LD node (assuming it's stored in the node data)
	text := ""
	if node.Data != nil {
		// Extract text from JSON-LD structure
		// This is a placeholder - actual implementation would parse JSON-LD
		text = "text from node"
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.EmotionAnalysisWorkflow, workflows.EmotionAnalysisWorkflowInput{
		Text:     text,
		NodeID:   nodeID.String(),
		NodeType: string(node.Type),
		OrgID:    orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.EmotionAnalysisWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Convert result to proto
	emotions := make(map[string]float64)
	for k, v := range result.Emotions {
		emotions[k] = v
	}

	return connect.NewResponse(&novelv1.AnalyzeEmotionsResponse{
		Emotions:        emotions,
		DominantEmotion: result.DominantEmotion,
		Confidence:      result.Confidence,
	}), nil
}

// GetEmotionProfile retrieves emotion profile for a node
func (s *NovelService) GetEmotionProfile(
	ctx context.Context,
	req *connect.Request[novelv1.GetEmotionProfileRequest],
) (*connect.Response[novelv1.GetEmotionProfileResponse], error) {
	nodeID, err := uuid.Parse(req.Msg.NodeId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Note: GetEmotionProfileRequest doesn't have NodeType, but SQL query requires it
	// Using empty string to match any node type
	emotionProfile, err := s.queries.GetEmotionProfile(ctx, sqlc.GetEmotionProfileParams{
		NodeID:   uuidToPgUUID(nodeID),
		NodeType: "",
	})
	if err == pgx.ErrNoRows {
		return connect.NewResponse(&novelv1.GetEmotionProfileResponse{
			EmotionProfile: nil,
		}), nil
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	nodeTypeStrResult := emotionProfile.NodeType
	joy := float64(0)
	if joyPtr := pgFloat8ToFloat64(emotionProfile.Joy); joyPtr != nil {
		joy = *joyPtr
	}
	sadness := float64(0)
	if sadnessPtr := pgFloat8ToFloat64(emotionProfile.Sadness); sadnessPtr != nil {
		sadness = *sadnessPtr
	}
	fear := float64(0)
	if fearPtr := pgFloat8ToFloat64(emotionProfile.Fear); fearPtr != nil {
		fear = *fearPtr
	}
	anger := float64(0)
	if angerPtr := pgFloat8ToFloat64(emotionProfile.Anger); angerPtr != nil {
		anger = *angerPtr
	}
	surprise := float64(0)
	if surprisePtr := pgFloat8ToFloat64(emotionProfile.Surprise); surprisePtr != nil {
		surprise = *surprisePtr
	}
	trust := float64(0)
	if trustPtr := pgFloat8ToFloat64(emotionProfile.Trust); trustPtr != nil {
		trust = *trustPtr
	}
	anticipation := float64(0)
	if anticipationPtr := pgFloat8ToFloat64(emotionProfile.Anticipation); anticipationPtr != nil {
		anticipation = *anticipationPtr
	}
	disgust := float64(0)
	if disgustPtr := pgFloat8ToFloat64(emotionProfile.Disgust); disgustPtr != nil {
		disgust = *disgustPtr
	}
	relief := float64(0)
	if reliefPtr := pgFloat8ToFloat64(emotionProfile.Relief); reliefPtr != nil {
		relief = *reliefPtr
	}
	hope := float64(0)
	if hopePtr := pgFloat8ToFloat64(emotionProfile.Hope); hopePtr != nil {
		hope = *hopePtr
	}

	return connect.NewResponse(&novelv1.GetEmotionProfileResponse{
		EmotionProfile: &novelv1.EmotionProfile{
			Id:                pgUUIDToString(emotionProfile.ID),
			NodeId:            pgUUIDToString(emotionProfile.NodeID),
			NodeType:          &nodeTypeStrResult,
			Joy:               joy,
			Sadness:           sadness,
			Fear:              fear,
			Anger:             anger,
			Surprise:          surprise,
			Trust:             trust,
			Anticipation:      anticipation,
			Disgust:           disgust,
			Relief:            relief,
			Hope:              hope,
			EmotionVectorJson: stringPtr(string(emotionProfile.EmotionVectorJson)),
			CreatedAt:         pgTimestamptzToString(emotionProfile.CreatedAt),
			UpdatedAt:         pgTimestamptzToString(emotionProfile.UpdatedAt),
		},
	}), nil
}

// GenerateText generates text using AI
func (s *NovelService) GenerateText(
	ctx context.Context,
	req *connect.Request[novelv1.GenerateTextRequest],
) (*connect.Response[novelv1.GenerateTextResponse], error) {
	// TODO: Implement text generation with OpenAI
	return nil, connect.NewError(connect.CodeUnimplemented, nil)
}

// GenerateImage generates an image using AI via Temporal workflow
func (s *NovelService) GenerateImage(
	ctx context.Context,
	req *connect.Request[novelv1.GenerateImageRequest],
) (*connect.Response[novelv1.GenerateImageResponse], error) {
	model := "dall-e-3"
	if req.Msg.Model != nil {
		model = *req.Msg.Model
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Use a dummy scene ID since NovelService doesn't have scenes
	dummySceneID := uuid.New().String()

	// Start Temporal workflow for image generation
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("novel-image-gen-%s-%s", dummySceneID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.ImageGenerationWorkflow, workflows.ImageGenerationWorkflowInput{
		SceneID:  dummySceneID,
		Prompt:   req.Msg.Prompt,
		Model:    model,
		Provider: "openai",
		OrgID:    orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.ImageGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	imageBase64 := base64.StdEncoding.EncodeToString(result.ImageData)

	return connect.NewResponse(&novelv1.GenerateImageResponse{
		ImageBase64: imageBase64,
	}), nil
}

// ExportEpub exports novel as EPUB via Temporal workflow
func (s *NovelService) ExportEpub(
	ctx context.Context,
	req *connect.Request[novelv1.ExportEpubRequest],
) (*connect.Response[novelv1.ExportEpubResponse], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Get chapter IDs if specified
	chapterIDs := make([]string, 0)
	if len(req.Msg.ChapterIds) > 0 {
		chapterIDs = req.Msg.ChapterIds
	} else {
		// Get all chapters for the project
		chapters, err := s.queries.ListChapters(ctx, uuidToPgUUID(novelProjectID))
		if err == nil {
			for _, ch := range chapters {
				chapterIDs = append(chapterIDs, pgUUIDToString(ch.ID))
			}
		}
	}

	// Start Temporal workflow for EPUB export
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("epub-export-%s-%s", novelProjectID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.EpubExportWorkflow, workflows.EpubExportWorkflowInput{
		NovelProjectID: novelProjectID.String(),
		ChapterIDs:     chapterIDs,
		OrgID:          orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.EpubExportWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	epubBase64 := base64.StdEncoding.EncodeToString(result.EpubData)

	return connect.NewResponse(&novelv1.ExportEpubResponse{
		EpubBase64: epubBase64,
		Filename:   result.Filename,
	}), nil
}

// ImportEpub imports novel from EPUB via Temporal workflow
func (s *NovelService) ImportEpub(
	ctx context.Context,
	req *connect.Request[novelv1.ImportEpubRequest],
) (*connect.Response[novelv1.ImportEpubResponse], error) {
	novelProjectID, err := uuid.Parse(req.Msg.NovelProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	// Decode EPUB data
	epubData, err := base64.StdEncoding.DecodeString(req.Msg.EpubBase64)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Start Temporal workflow for EPUB import
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("epub-import-%s-%s", novelProjectID, uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.EpubImportWorkflow, workflows.EpubImportWorkflowInput{
		NovelProjectID: novelProjectID.String(),
		EpubData:       epubData,
		OrgID:          orgID,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.EpubImportWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&novelv1.ImportEpubResponse{
		ChaptersCreated: result.ChaptersCreated,
	}), nil
}

// Helper function to convert string to JsonldNodeType enum
func jsonldNodeTypeFromString(s string) novelv1.JsonldNodeType {
	switch s {
	case "character":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_CHARACTER
	case "ghost":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_GHOST
	case "location":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_LOCATION
	case "organization":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_ORGANIZATION
	case "company":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_COMPANY
	case "technology":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_TECHNOLOGY
	case "episode":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_EPISODE
	case "scene":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_SCENE
	case "arc":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_ARC
	case "motif":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_MOTIF
	case "season":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_SEASON
	case "timeline":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_TIMELINE
	case "pov":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_POV
	case "beat":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_BEAT
	case "event":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_EVENT
	case "source_ref":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_SOURCE_REF
	case "occupation":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_OCCUPATION
	case "setting":
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_SETTING
	default:
		return novelv1.JsonldNodeType_JSONLD_NODE_TYPE_UNSPECIFIED
	}
}
