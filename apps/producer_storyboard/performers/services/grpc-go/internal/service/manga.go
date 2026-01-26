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
	mangav1 "github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/manga/v1"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/services"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
	"go.temporal.io/sdk/client"
)

// MangaService implements the MangaService gRPC service
type MangaService struct {
	db             *pgxpool.Pool
	queries        *sqlc.Queries
	temporalClient client.Client
	openai         *services.OpenAIService
}

// NewMangaService creates a new MangaService
func NewMangaService(pool *pgxpool.Pool, temporalClient client.Client) (*MangaService, error) {
	queries := sqlc.New(pool)

	openai, err := services.NewOpenAIService()
	if err != nil {
		openai = nil
	}

	return &MangaService{
		db:             pool,
		queries:        queries,
		temporalClient: temporalClient,
		openai:         openai,
	}, nil
}

// ListMangaProjects lists all manga projects for a project
func (s *MangaService) ListMangaProjects(
	ctx context.Context,
	req *connect.Request[mangav1.ListMangaProjectsRequest],
) (*connect.Response[mangav1.ListMangaProjectsResponse], error) {
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	mangaProjects, err := s.queries.ListMangaProjectsByProjectId(ctx, uuidToPgUUID(projectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbProjects := make([]*mangav1.MangaProject, 0, len(mangaProjects))
	for _, p := range mangaProjects {
		pbProjects = append(pbProjects, &mangav1.MangaProject{
			Id:          pgUUIDToString(p.ID),
			ProjectId:   pgUUIDToString(p.ProjectID),
			Title:       p.Title,
			Description: pgTextToString(p.Description),
			CreatedAt:   pgTimestamptzToString(p.CreatedAt),
			UpdatedAt:   pgTimestamptzToString(p.UpdatedAt),
		})
	}

	return connect.NewResponse(&mangav1.ListMangaProjectsResponse{
		Projects: pbProjects,
	}), nil
}

// GetMangaProject retrieves a manga project by ID
func (s *MangaService) GetMangaProject(
	ctx context.Context,
	req *connect.Request[mangav1.GetMangaProjectRequest],
) (*connect.Response[mangav1.MangaProject], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	mangaProject, err := s.queries.GetMangaProject(ctx, uuidToPgUUID(mangaProjectID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.MangaProject{
		Id:          pgUUIDToString(mangaProject.ID),
		ProjectId:   pgUUIDToString(mangaProject.ProjectID),
		Title:       mangaProject.Title,
		Description: pgTextToString(mangaProject.Description),
		CreatedAt:   pgTimestamptzToString(mangaProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(mangaProject.UpdatedAt),
	}), nil
}

// CreateMangaProject creates a new manga project
func (s *MangaService) CreateMangaProject(
	ctx context.Context,
	req *connect.Request[mangav1.CreateMangaProjectRequest],
) (*connect.Response[mangav1.MangaProject], error) {
	orgID := auth.GetOrgIDFromContext(ctx)
	projectID, err := uuid.Parse(req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	var orgIDPg pgtype.Text
	if orgID != "" {
		orgIDPg = stringToPgText(&orgID)
	}

	mangaProject, err := s.queries.CreateMangaProject(ctx, sqlc.CreateMangaProjectParams{
		ProjectID:   uuidToPgUUID(projectID),
		Title:       req.Msg.Title,
		Description: stringToPgText(req.Msg.Description),
		OrgID:       orgIDPg,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.MangaProject{
		Id:          pgUUIDToString(mangaProject.ID),
		ProjectId:   pgUUIDToString(mangaProject.ProjectID),
		Title:       mangaProject.Title,
		Description: pgTextToString(mangaProject.Description),
		CreatedAt:   pgTimestamptzToString(mangaProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(mangaProject.UpdatedAt),
	}), nil
}

// UpdateMangaProject updates an existing manga project
func (s *MangaService) UpdateMangaProject(
	ctx context.Context,
	req *connect.Request[mangav1.UpdateMangaProjectRequest],
) (*connect.Response[mangav1.MangaProject], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	title := ""
	if req.Msg.Title != nil {
		title = *req.Msg.Title
	}

	mangaProject, err := s.queries.UpdateMangaProject(ctx, sqlc.UpdateMangaProjectParams{
		ID:          uuidToPgUUID(mangaProjectID),
		Title:       title,
		Description: stringToPgText(req.Msg.Description),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.MangaProject{
		Id:          pgUUIDToString(mangaProject.ID),
		ProjectId:   pgUUIDToString(mangaProject.ProjectID),
		Title:       mangaProject.Title,
		Description: pgTextToString(mangaProject.Description),
		CreatedAt:   pgTimestamptzToString(mangaProject.CreatedAt),
		UpdatedAt:   pgTimestamptzToString(mangaProject.UpdatedAt),
	}), nil
}

// DeleteMangaProject deletes a manga project
func (s *MangaService) DeleteMangaProject(
	ctx context.Context,
	req *connect.Request[mangav1.DeleteMangaProjectRequest],
) (*connect.Response[mangav1.DeleteMangaProjectResponse], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteMangaProject(ctx, uuidToPgUUID(mangaProjectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.DeleteMangaProjectResponse{
		Success: true,
	}), nil
}

// ListPages lists all pages for a manga project
func (s *MangaService) ListPages(
	ctx context.Context,
	req *connect.Request[mangav1.ListPagesRequest],
) (*connect.Response[mangav1.ListPagesResponse], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.MangaProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	pages, err := s.queries.ListMangaPages(ctx, uuidToPgUUID(mangaProjectID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbPages := make([]*mangav1.Page, 0, len(pages))
	for _, p := range pages {
		pbPages = append(pbPages, &mangav1.Page{
			Id:             pgUUIDToString(p.ID),
			MangaProjectId: pgUUIDToString(p.MangaProjectID),
			PageNumber:     p.PageNumber,
			KonvaStageJson: pgTextToString(p.KonvaStageJson),
			CreatedAt:      pgTimestamptzToString(p.CreatedAt),
			UpdatedAt:      pgTimestamptzToString(p.UpdatedAt),
		})
	}

	return connect.NewResponse(&mangav1.ListPagesResponse{
		Pages: pbPages,
	}), nil
}

// GetPage retrieves a page by ID
func (s *MangaService) GetPage(
	ctx context.Context,
	req *connect.Request[mangav1.GetPageRequest],
) (*connect.Response[mangav1.Page], error) {
	pageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	page, err := s.queries.GetMangaPage(ctx, uuidToPgUUID(pageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Page{
		Id:             pgUUIDToString(page.ID),
		MangaProjectId: pgUUIDToString(page.MangaProjectID),
		PageNumber:     page.PageNumber,
		KonvaStageJson: pgTextToString(page.KonvaStageJson),
		CreatedAt:      pgTimestamptzToString(page.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(page.UpdatedAt),
	}), nil
}

// CreatePage creates a new page
func (s *MangaService) CreatePage(
	ctx context.Context,
	req *connect.Request[mangav1.CreatePageRequest],
) (*connect.Response[mangav1.Page], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.MangaProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	pageNumber := int32(1)
	if req.Msg.PageNumber != nil {
		pageNumber = *req.Msg.PageNumber
	}

	page, err := s.queries.CreateMangaPage(ctx, sqlc.CreateMangaPageParams{
		MangaProjectID: uuidToPgUUID(mangaProjectID),
		PageNumber:     pageNumber,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Page{
		Id:             pgUUIDToString(page.ID),
		MangaProjectId: pgUUIDToString(page.MangaProjectID),
		PageNumber:     page.PageNumber,
		KonvaStageJson: pgTextToString(page.KonvaStageJson),
		CreatedAt:      pgTimestamptzToString(page.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(page.UpdatedAt),
	}), nil
}

// UpdatePage updates an existing page
func (s *MangaService) UpdatePage(
	ctx context.Context,
	req *connect.Request[mangav1.UpdatePageRequest],
) (*connect.Response[mangav1.Page], error) {
	pageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	pageNumber := int32(1)
	if req.Msg.PageNumber != nil {
		pageNumber = *req.Msg.PageNumber
	}

	page, err := s.queries.UpdateMangaPage(ctx, sqlc.UpdateMangaPageParams{
		ID:         uuidToPgUUID(pageID),
		PageNumber: pageNumber,
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Page{
		Id:             pgUUIDToString(page.ID),
		MangaProjectId: pgUUIDToString(page.MangaProjectID),
		PageNumber:     page.PageNumber,
		KonvaStageJson: pgTextToString(page.KonvaStageJson),
		CreatedAt:      pgTimestamptzToString(page.CreatedAt),
		UpdatedAt:      pgTimestamptzToString(page.UpdatedAt),
	}), nil
}

// DeletePage deletes a page
func (s *MangaService) DeletePage(
	ctx context.Context,
	req *connect.Request[mangav1.DeletePageRequest],
) (*connect.Response[mangav1.DeletePageResponse], error) {
	pageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteMangaPage(ctx, uuidToPgUUID(pageID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.DeletePageResponse{
		Success: true,
	}), nil
}

// GetPageContent retrieves page content (Konva JSON)
func (s *MangaService) GetPageContent(
	ctx context.Context,
	req *connect.Request[mangav1.GetPageContentRequest],
) (*connect.Response[mangav1.GetPageContentResponse], error) {
	pageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	page, err := s.queries.GetMangaPage(ctx, uuidToPgUUID(pageID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.GetPageContentResponse{
		KonvaStageJson: pgTextToString(page.KonvaStageJson),
	}), nil
}

// UpdatePageContent updates page content (Konva JSON)
func (s *MangaService) UpdatePageContent(
	ctx context.Context,
	req *connect.Request[mangav1.UpdatePageContentRequest],
) (*connect.Response[mangav1.UpdatePageContentResponse], error) {
	pageID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	_, err = s.queries.UpdateMangaPageContent(ctx, sqlc.UpdateMangaPageContentParams{
		ID:             uuidToPgUUID(pageID),
		KonvaStageJson: stringToPgText(&req.Msg.KonvaStageJson),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.UpdatePageContentResponse{
		Success: true,
	}), nil
}

// ListPanels lists all panels for a page
func (s *MangaService) ListPanels(
	ctx context.Context,
	req *connect.Request[mangav1.ListPanelsRequest],
) (*connect.Response[mangav1.ListPanelsResponse], error) {
	pageID, err := uuid.Parse(req.Msg.PageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	panels, err := s.queries.ListMangaPanels(ctx, uuidToPgUUID(pageID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbPanels := make([]*mangav1.Panel, 0, len(panels))
	for _, p := range panels {
		pbPanels = append(pbPanels, &mangav1.Panel{
			Id:         pgUUIDToString(p.ID),
			PageId:     pgUUIDToString(p.PageID),
			OrderIndex: p.OrderIndex,
			X:          p.X.Float64,
			Y:          p.Y.Float64,
			Width:      p.Width.Float64,
			Height:     p.Height.Float64,
			LayoutType: pgTextToString(p.LayoutType),
			Prompt:     pgTextToString(p.Prompt),
			CreatedAt:  pgTimestamptzToString(p.CreatedAt),
			UpdatedAt:  pgTimestamptzToString(p.UpdatedAt),
		})
	}

	return connect.NewResponse(&mangav1.ListPanelsResponse{
		Panels: pbPanels,
	}), nil
}

// GetPanel retrieves a panel by ID
func (s *MangaService) GetPanel(
	ctx context.Context,
	req *connect.Request[mangav1.GetPanelRequest],
) (*connect.Response[mangav1.Panel], error) {
	panelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	panel, err := s.queries.GetMangaPanel(ctx, uuidToPgUUID(panelID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Panel{
		Id:         pgUUIDToString(panel.ID),
		PageId:     pgUUIDToString(panel.PageID),
		OrderIndex: panel.OrderIndex,
		X:          panel.X.Float64,
		Y:          panel.Y.Float64,
		Width:      panel.Width.Float64,
		Height:     panel.Height.Float64,
		LayoutType: pgTextToString(panel.LayoutType),
		Prompt:     pgTextToString(panel.Prompt),
		CreatedAt:  pgTimestamptzToString(panel.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(panel.UpdatedAt),
	}), nil
}

// CreatePanel creates a new panel
func (s *MangaService) CreatePanel(
	ctx context.Context,
	req *connect.Request[mangav1.CreatePanelRequest],
) (*connect.Response[mangav1.Panel], error) {
	pageID, err := uuid.Parse(req.Msg.PageId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	x := 0.0
	if req.Msg.X != nil {
		x = *req.Msg.X
	}

	y := 0.0
	if req.Msg.Y != nil {
		y = *req.Msg.Y
	}

	width := 0.0
	if req.Msg.Width != nil {
		width = *req.Msg.Width
	}

	height := 0.0
	if req.Msg.Height != nil {
		height = *req.Msg.Height
	}

	panel, err := s.queries.CreateMangaPanel(ctx, sqlc.CreateMangaPanelParams{
		PageID:     uuidToPgUUID(pageID),
		OrderIndex: orderIndex,
		X:          float64ToPgFloat8(&x),
		Y:          float64ToPgFloat8(&y),
		Width:      float64ToPgFloat8(&width),
		Height:     float64ToPgFloat8(&height),
		LayoutType: stringToPgText(req.Msg.LayoutType),
		Prompt:     stringToPgText(req.Msg.Prompt),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Panel{
		Id:         pgUUIDToString(panel.ID),
		PageId:     pgUUIDToString(panel.PageID),
		OrderIndex: panel.OrderIndex,
		X:          panel.X.Float64,
		Y:          panel.Y.Float64,
		Width:      panel.Width.Float64,
		Height:     panel.Height.Float64,
		LayoutType: pgTextToString(panel.LayoutType),
		Prompt:     pgTextToString(panel.Prompt),
		CreatedAt:  pgTimestamptzToString(panel.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(panel.UpdatedAt),
	}), nil
}

// UpdatePanel updates an existing panel
func (s *MangaService) UpdatePanel(
	ctx context.Context,
	req *connect.Request[mangav1.UpdatePanelRequest],
) (*connect.Response[mangav1.Panel], error) {
	panelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	orderIndex := int32(0)
	if req.Msg.OrderIndex != nil {
		orderIndex = *req.Msg.OrderIndex
	}

	x := 0.0
	if req.Msg.X != nil {
		x = *req.Msg.X
	}

	y := 0.0
	if req.Msg.Y != nil {
		y = *req.Msg.Y
	}

	width := 0.0
	if req.Msg.Width != nil {
		width = *req.Msg.Width
	}

	height := 0.0
	if req.Msg.Height != nil {
		height = *req.Msg.Height
	}

	panel, err := s.queries.UpdateMangaPanel(ctx, sqlc.UpdateMangaPanelParams{
		ID:         uuidToPgUUID(panelID),
		OrderIndex: orderIndex,
		X:          float64ToPgFloat8(&x),
		Y:          float64ToPgFloat8(&y),
		Width:      float64ToPgFloat8(&width),
		Height:     float64ToPgFloat8(&height),
		LayoutType: stringToPgText(req.Msg.LayoutType),
		Prompt:     stringToPgText(req.Msg.Prompt),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.Panel{
		Id:         pgUUIDToString(panel.ID),
		PageId:     pgUUIDToString(panel.PageID),
		OrderIndex: panel.OrderIndex,
		X:          panel.X.Float64,
		Y:          panel.Y.Float64,
		Width:      panel.Width.Float64,
		Height:     panel.Height.Float64,
		LayoutType: pgTextToString(panel.LayoutType),
		Prompt:     pgTextToString(panel.Prompt),
		CreatedAt:  pgTimestamptzToString(panel.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(panel.UpdatedAt),
	}), nil
}

// DeletePanel deletes a panel
func (s *MangaService) DeletePanel(
	ctx context.Context,
	req *connect.Request[mangav1.DeletePanelRequest],
) (*connect.Response[mangav1.DeletePanelResponse], error) {
	panelID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteMangaPanel(ctx, uuidToPgUUID(panelID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.DeletePanelResponse{
		Success: true,
	}), nil
}

// ListSpeechBubbles lists all speech bubbles for a panel
func (s *MangaService) ListSpeechBubbles(
	ctx context.Context,
	req *connect.Request[mangav1.ListSpeechBubblesRequest],
) (*connect.Response[mangav1.ListSpeechBubblesResponse], error) {
	panelID, err := uuid.Parse(req.Msg.PanelId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	bubbles, err := s.queries.ListSpeechBubbles(ctx, uuidToPgUUID(panelID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	pbBubbles := make([]*mangav1.SpeechBubble, 0, len(bubbles))
	for _, b := range bubbles {
		bubbleType := speechBubbleTypeFromString(b.BubbleType)
		pbBubbles = append(pbBubbles, &mangav1.SpeechBubble{
			Id:         pgUUIDToString(b.ID),
			PanelId:    pgUUIDToString(b.PanelID),
			BubbleType: bubbleType,
			Text:       b.Text,
			Speaker:    pgTextToString(b.Speaker),
			X:          b.X.Float64,
			Y:          b.Y.Float64,
			Width:      b.Width.Float64,
			Height:     b.Height.Float64,
			CreatedAt:  pgTimestamptzToString(b.CreatedAt),
			UpdatedAt:  pgTimestamptzToString(b.UpdatedAt),
		})
	}

	return connect.NewResponse(&mangav1.ListSpeechBubblesResponse{
		SpeechBubbles: pbBubbles,
	}), nil
}

// GetSpeechBubble retrieves a speech bubble by ID
func (s *MangaService) GetSpeechBubble(
	ctx context.Context,
	req *connect.Request[mangav1.GetSpeechBubbleRequest],
) (*connect.Response[mangav1.SpeechBubble], error) {
	bubbleID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	bubble, err := s.queries.GetSpeechBubble(ctx, uuidToPgUUID(bubbleID))
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	bubbleType := speechBubbleTypeFromString(bubble.BubbleType)
	return connect.NewResponse(&mangav1.SpeechBubble{
		Id:         pgUUIDToString(bubble.ID),
		PanelId:    pgUUIDToString(bubble.PanelID),
		BubbleType: bubbleType,
		Text:       bubble.Text,
		Speaker:    pgTextToString(bubble.Speaker),
		X:          bubble.X.Float64,
		Y:          bubble.Y.Float64,
		Width:      bubble.Width.Float64,
		Height:     bubble.Height.Float64,
		CreatedAt:  pgTimestamptzToString(bubble.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(bubble.UpdatedAt),
	}), nil
}

// CreateSpeechBubble creates a new speech bubble
func (s *MangaService) CreateSpeechBubble(
	ctx context.Context,
	req *connect.Request[mangav1.CreateSpeechBubbleRequest],
) (*connect.Response[mangav1.SpeechBubble], error) {
	panelID, err := uuid.Parse(req.Msg.PanelId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	bubbleTypeStr := req.Msg.BubbleType.String()

	x := 0.0
	if req.Msg.X != nil {
		x = *req.Msg.X
	}

	y := 0.0
	if req.Msg.Y != nil {
		y = *req.Msg.Y
	}

	width := 0.0
	if req.Msg.Width != nil {
		width = *req.Msg.Width
	}

	height := 0.0
	if req.Msg.Height != nil {
		height = *req.Msg.Height
	}

	bubble, err := s.queries.CreateSpeechBubble(ctx, sqlc.CreateSpeechBubbleParams{
		PanelID:    uuidToPgUUID(panelID),
		BubbleType: bubbleTypeStr,
		Text:       req.Msg.Text,
		Speaker:    stringToPgText(req.Msg.Speaker),
		X:          float64ToPgFloat8(&x),
		Y:          float64ToPgFloat8(&y),
		Width:      float64ToPgFloat8(&width),
		Height:     float64ToPgFloat8(&height),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	bubbleType := speechBubbleTypeFromString(bubble.BubbleType)
	return connect.NewResponse(&mangav1.SpeechBubble{
		Id:         pgUUIDToString(bubble.ID),
		PanelId:    pgUUIDToString(bubble.PanelID),
		BubbleType: bubbleType,
		Text:       bubble.Text,
		Speaker:    pgTextToString(bubble.Speaker),
		X:          bubble.X.Float64,
		Y:          bubble.Y.Float64,
		Width:      bubble.Width.Float64,
		Height:     bubble.Height.Float64,
		CreatedAt:  pgTimestamptzToString(bubble.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(bubble.UpdatedAt),
	}), nil
}

// UpdateSpeechBubble updates an existing speech bubble
func (s *MangaService) UpdateSpeechBubble(
	ctx context.Context,
	req *connect.Request[mangav1.UpdateSpeechBubbleRequest],
) (*connect.Response[mangav1.SpeechBubble], error) {
	bubbleID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	bubbleTypeStr := ""
	if req.Msg.BubbleType != nil {
		bubbleTypeStr = req.Msg.BubbleType.String()
	}

	text := ""
	if req.Msg.Text != nil {
		text = *req.Msg.Text
	}

	x := 0.0
	if req.Msg.X != nil {
		x = *req.Msg.X
	}

	y := 0.0
	if req.Msg.Y != nil {
		y = *req.Msg.Y
	}

	width := 0.0
	if req.Msg.Width != nil {
		width = *req.Msg.Width
	}

	height := 0.0
	if req.Msg.Height != nil {
		height = *req.Msg.Height
	}

	bubble, err := s.queries.UpdateSpeechBubble(ctx, sqlc.UpdateSpeechBubbleParams{
		ID:         uuidToPgUUID(bubbleID),
		BubbleType: bubbleTypeStr,
		Text:       text,
		Speaker:    stringToPgText(req.Msg.Speaker),
		X:          float64ToPgFloat8(&x),
		Y:          float64ToPgFloat8(&y),
		Width:      float64ToPgFloat8(&width),
		Height:     float64ToPgFloat8(&height),
	})
	if err == pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	bubbleType := speechBubbleTypeFromString(bubble.BubbleType)
	return connect.NewResponse(&mangav1.SpeechBubble{
		Id:         pgUUIDToString(bubble.ID),
		PanelId:    pgUUIDToString(bubble.PanelID),
		BubbleType: bubbleType,
		Text:       bubble.Text,
		Speaker:    pgTextToString(bubble.Speaker),
		X:          bubble.X.Float64,
		Y:          bubble.Y.Float64,
		Width:      bubble.Width.Float64,
		Height:     bubble.Height.Float64,
		CreatedAt:  pgTimestamptzToString(bubble.CreatedAt),
		UpdatedAt:  pgTimestamptzToString(bubble.UpdatedAt),
	}), nil
}

// DeleteSpeechBubble deletes a speech bubble
func (s *MangaService) DeleteSpeechBubble(
	ctx context.Context,
	req *connect.Request[mangav1.DeleteSpeechBubbleRequest],
) (*connect.Response[mangav1.DeleteSpeechBubbleResponse], error) {
	bubbleID, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = s.queries.DeleteSpeechBubble(ctx, uuidToPgUUID(bubbleID))
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.DeleteSpeechBubbleResponse{
		Success: true,
	}), nil
}

// GeneratePanelImage generates images for a panel using AI via Temporal workflow
func (s *MangaService) GeneratePanelImage(
	ctx context.Context,
	req *connect.Request[mangav1.GeneratePanelImageRequest],
) (*connect.Response[mangav1.GeneratePanelImageResponse], error) {
	mangaProjectID, err := uuid.Parse(req.Msg.MangaProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	model := "dall-e-3"
	if req.Msg.Model != nil {
		model = *req.Msg.Model
	}

	numImages := 1
	if req.Msg.NumImages != nil {
		numImages = int(*req.Msg.NumImages)
	}

	var panelID string
	if req.Msg.PanelId != nil {
		panelID = *req.Msg.PanelId
	}

	orgID := auth.GetOrgIDFromContext(ctx)

	// Use a dummy scene ID since MangaService doesn't have scenes
	dummySceneID := uuid.New().String()

	images := make([]*mangav1.GeneratedImage, 0, numImages)
	for i := 0; i < numImages; {
		// Start Temporal workflow for each image
		workflowOptions := client.StartWorkflowOptions{
			ID:        fmt.Sprintf("manga-image-gen-%s-%d-%s", mangaProjectID, i, uuid.New().String()[:8]),
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
			// Continue with next image on error
			continue
		}

		// Save to manga_generated_images table
		var panelIDPg pgtype.UUID
		if panelID != "" {
			parsedPanelID, err := uuid.Parse(panelID)
			if err == nil {
				panelIDPg = uuidToPgUUID(parsedPanelID)
			}
		}

		imageFormat := result.ImageFormat
		if imageFormat == "" {
			imageFormat = "png"
		}

		width := int32(1024)
		height := int32(1024)
		mangaImage, err := s.queries.CreateMangaGeneratedImage(ctx, sqlc.CreateMangaGeneratedImageParams{
			MangaProjectID: uuidToPgUUID(mangaProjectID),
			PanelID:        panelIDPg,
			ImageData:      result.ImageData,
			ImageFormat:    imageFormat,
			Width:          int32ToPgInt4(&width),
			Height:         int32ToPgInt4(&height),
			Prompt:         stringToPgText(&req.Msg.Prompt),
			Model:          stringToPgText(&model),
		})
		if err != nil {
			continue
		}

		imageBase64 := base64.StdEncoding.EncodeToString(result.ImageData)
		images = append(images, &mangav1.GeneratedImage{
			Id:          pgUUIDToString(mangaImage.ID),
			ImageBase64: imageBase64,
			Format:      imageFormat,
			Width:       1024,
			Height:      1024,
			CreatedAt:   pgTimestamptzToString(mangaImage.CreatedAt),
		})
		i++
	}

	return connect.NewResponse(&mangav1.GeneratePanelImageResponse{
		Images: images,
	}), nil
}

// GenerateStory generates a manga story/script using AI via Temporal workflow
func (s *MangaService) GenerateStory(
	ctx context.Context,
	req *connect.Request[mangav1.GenerateStoryRequest],
) (*connect.Response[mangav1.GenerateStoryResponse], error) {
	orgID := auth.GetOrgIDFromContext(ctx)

	// Start Temporal workflow for text generation
	workflowOptions := client.StartWorkflowOptions{
		ID:        fmt.Sprintf("manga-story-gen-%s", uuid.New().String()[:8]),
		TaskQueue: temporal.TaskQueue,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflows.TextGenerationWorkflow, workflows.TextGenerationWorkflowInput{
		Prompt:    req.Msg.Prompt,
		Model:     "gpt-4",
		MaxTokens: 2000,
		OrgID:     orgID,
		Context:   map[string]interface{}{"type": "manga_story"},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Wait for workflow to complete
	var result workflows.TextGenerationWorkflowResult
	err = we.Get(ctx, &result)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&mangav1.GenerateStoryResponse{
		Story: result.GeneratedText,
	}), nil
}

// ExportPage exports a manga page as image/PDF
func (s *MangaService) ExportPage(
	ctx context.Context,
	req *connect.Request[mangav1.ExportPageRequest],
) (*connect.Response[mangav1.ExportPageResponse], error) {
	// TODO: Implement page export
	return nil, connect.NewError(connect.CodeUnimplemented, nil)
}

// Helper function to convert string to SpeechBubbleType enum
func speechBubbleTypeFromString(s string) mangav1.SpeechBubbleType {
	switch s {
	case "speech":
		return mangav1.SpeechBubbleType_SPEECH_BUBBLE_TYPE_SPEECH
	case "thought":
		return mangav1.SpeechBubbleType_SPEECH_BUBBLE_TYPE_THOUGHT
	case "shout":
		return mangav1.SpeechBubbleType_SPEECH_BUBBLE_TYPE_SHOUT
	default:
		return mangav1.SpeechBubbleType_SPEECH_BUBBLE_TYPE_UNSPECIFIED
	}
}
