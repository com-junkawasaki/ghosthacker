package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
	"storyboard-editor/backend/internal/mcp"
	"storyboard-editor/backend/internal/schema"
	"storyboard-editor/backend/proto"

	"bytes"
	goimage "image"
	"image/jpeg"
	"image/png"
	// Import for side effects - registers decoders
	_ "golang.org/x/image/webp"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"golang.org/x/image/draw"
)

type StoryboardService struct {
	storyboardPath string
	cueCtx         *cue.Context
	schema         cue.Value
	mcpServer      *mcp.StoryboardMCPServer
	
	mu          sync.RWMutex
	subscribers map[string]chan *storyboardpb.StreamUpdatesResponse
}

func NewStoryboardService(storyboardPath string) *StoryboardService {
	cueCtx := cuecontext.New()
	return &StoryboardService{
		storyboardPath: storyboardPath,
		cueCtx:         cueCtx,
		schema:         schema.GetSchema(),
		mcpServer:      mcp.NewStoryboardMCPServer(),
		subscribers:    make(map[string]chan *storyboardpb.StreamUpdatesResponse),
	}
}

func (s *StoryboardService) validateAndLoad(filePath string) (map[string]interface{}, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse JSON
	var data map[string]interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Validate with CUE
	val := s.cueCtx.CompileBytes(content)
	unified := val.Unify(s.schema)
	if err := unified.Validate(cue.Final()); err != nil {
		return nil, fmt.Errorf("CUE validation failed: %w", err)
	}

	return data, nil
}

func (s *StoryboardService) aggregateMaster(filePath string) (map[string]interface{}, error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}

	// Load base storyboard for context and metadata
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var master map[string]interface{}
	if err := json.Unmarshal(content, &master); err != nil {
		return nil, err
	}

	// Helper to resolve source files
	resolveLinks := func(key string) {
		items, ok := master[key].([]interface{})
		if !ok {
			return
		}

		var resolvedItems []interface{}
		for _, item := range items {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			sourceFile, ok := m["gh:sourceFile"].(string)
			if !ok {
				resolvedItems = append(resolvedItems, item)
				continue
			}

		fullPath := filepath.Join(workspaceRoot, "260123-jump/resources", sourceFile)
		log.Printf("aggregateMaster: resolving %s -> %s", sourceFile, fullPath)
		data, err := os.ReadFile(fullPath)
		if err != nil {
			log.Printf("Warning: failed to read source file %s (workspaceRoot: %s): %v", fullPath, workspaceRoot, err)
			resolvedItems = append(resolvedItems, item)
			continue
		}

			var resolvedData map[string]interface{}
			if err := json.Unmarshal(data, &resolvedData); err != nil {
				log.Printf("Warning: failed to parse source file %s: %v", fullPath, err)
				resolvedItems = append(resolvedItems, item)
				continue
			}

			// Merge: original item (with @id or gh:episodeId) + resolved data
			// Remove context from resolved data to avoid duplication
			delete(resolvedData, "@context")
			for k, v := range resolvedData {
				m[k] = v
			}
			resolvedItems = append(resolvedItems, m)
		}
		master[key] = resolvedItems
	}

	// 1. Resolve Organizations
	resolveLinks("gh:organizations")

	// 2. Resolve Characters
	resolveLinks("gh:characters")

	// 3. Resolve Environments
	resolveLinks("gh:environments")

	// 4. Resolve Episodes
	resolveLinks("gh:episodes")

	// 4.5 Resolve Acts within Episodes (gh:actStructure with gh:sourceFile)
	if episodes, ok := master["gh:episodes"].([]interface{}); ok {
		for _, ep := range episodes {
			episode, ok := ep.(map[string]interface{})
			if !ok {
				continue
			}

			// Get episode directory for relative path resolution
			episodeSourceFile, _ := episode["gh:sourceFile"].(string)
			episodeDir := filepath.Dir(episodeSourceFile)

			actStructure, ok := episode["gh:actStructure"].([]interface{})
			if !ok {
				continue
			}

			var resolvedActs []interface{}
			for _, act := range actStructure {
				actMap, ok := act.(map[string]interface{})
				if !ok {
					resolvedActs = append(resolvedActs, act)
					continue
				}

				actSourceFile, ok := actMap["gh:sourceFile"].(string)
				if !ok {
					resolvedActs = append(resolvedActs, act)
					continue
				}

				// Resolve relative to episode directory
				fullPath := filepath.Join(workspaceRoot, "260123-jump/resources", episodeDir, actSourceFile)
				log.Printf("aggregateMaster: resolving act %s -> %s", actSourceFile, fullPath)

				data, err := os.ReadFile(fullPath)
				if err != nil {
					log.Printf("Warning: failed to read act file %s: %v", fullPath, err)
					resolvedActs = append(resolvedActs, act)
					continue
				}

				var actData map[string]interface{}
				if err := json.Unmarshal(data, &actData); err != nil {
					log.Printf("Warning: failed to parse act file %s: %v", fullPath, err)
					resolvedActs = append(resolvedActs, act)
					continue
				}

				// Merge act metadata with resolved pages
				delete(actData, "@context")
				for k, v := range actData {
					actMap[k] = v
				}
				resolvedActs = append(resolvedActs, actMap)
			}
			episode["gh:actStructure"] = resolvedActs
		}
	}

	// 5. Resolve Arcs
	if arcRef, ok := master["gh:arcs"].(map[string]interface{}); ok {
		if sourceFile, ok := arcRef["gh:sourceFile"].(string); ok {
			fullPath := filepath.Join(workspaceRoot, "260123-jump/resources", sourceFile)
			data, err := os.ReadFile(fullPath)
			if err == nil {
				var arcData map[string]interface{}
				if err := json.Unmarshal(data, &arcData); err == nil {
					delete(arcData, "@context")
					master["gh:arcs"] = arcData
				}
			}
		}
	}

	return master, nil
}

func (s *StoryboardService) LoadStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardpb.LoadStoryboardRequest],
) (*connect.Response[storyboardpb.LoadStoryboardResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	data, err := s.aggregateMaster(filePath)
	if err != nil {
		log.Printf("LoadStoryboard: aggregation failed: %v", err)
		// Fallback to direct load
		data, err = s.validateAndLoad(filePath)
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
		}
	}

	metadata := s.extractMetadata(data)
	content, _ := json.MarshalIndent(data, "", "  ")

	return connect.NewResponse(&storyboardpb.LoadStoryboardResponse{
		JsonldContent: string(content),
		Metadata:      metadata,
	}), nil
}

func (s *StoryboardService) UpdatePanel(
	ctx context.Context,
	req *connect.Request[storyboardpb.UpdatePanelRequest],
) (*connect.Response[storyboardpb.UpdatePanelResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.validateAndLoad(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid storyboard: %w", err))
	}

	episodes, ok := storyboard["gh:episodes"].([]interface{})
	if !ok {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("gh:episodes not found"))
	}

	found := false
	for _, e := range episodes {
		episode, ok := e.(map[string]interface{})
		if !ok {
			continue
		}

		if episode["gh:episodeId"] != req.Msg.EpisodeId {
			continue
		}

		pages, ok := episode["gh:pages"].([]interface{})
		if !ok {
			continue
		}

		for _, pg := range pages {
			page, ok := pg.(map[string]interface{})
			if !ok {
				continue
			}

			pageNum, _ := page["gh:pageNumber"].(float64)
			if int32(pageNum) != req.Msg.PageNumber {
				continue
			}

			panels, ok := page["gh:panels"].([]interface{})
			if !ok {
				continue
			}

			for i, p := range panels {
				panel, ok := p.(map[string]interface{})
				if !ok {
					continue
				}

				panelIndex, _ := panel["panel"].(float64)
				if int32(panelIndex) == req.Msg.Panel {
					// Update panel data
					if req.Msg.PanelData.Characters != nil {
						charRefs := make([]interface{}, len(req.Msg.PanelData.Characters))
						for j, charID := range req.Msg.PanelData.Characters {
							charRefs[j] = charID
						}
						panel["characters"] = charRefs
					}

					if req.Msg.PanelData.Dialogue != nil {
						dialogue := make([]interface{}, len(req.Msg.PanelData.Dialogue))
						for j, d := range req.Msg.PanelData.Dialogue {
							dMap := map[string]interface{}{
								"speaker": d.Speaker,
								"text":    d.Text,
							}
							if d.Delivery != "" {
								dMap["gh:delivery"] = d.Delivery
							}
							if d.Subtext != "" {
								dMap["gh:subtext"] = d.Subtext
							}
							if d.Emotion != "" {
								dMap["gh:emotion"] = d.Emotion
							}
							if d.PauseBeforeMs > 0 {
								dMap["gh:pauseBeforeMs"] = d.PauseBeforeMs
							}
							if d.PauseAfterMs > 0 {
								dMap["gh:pauseAfterMs"] = d.PauseAfterMs
							}
							if d.MangaLayout != nil {
								dMap["gh:mangaLayout"] = map[string]interface{}{
									"text":     d.MangaLayout.Text,
									"type":     d.MangaLayout.Type,
									"x":        d.MangaLayout.X,
									"y":        d.MangaLayout.Y,
									"fontSize": d.MangaLayout.FontSize,
									"style":    d.MangaLayout.Style,
								}
							}
							dialogue[j] = dMap
						}
						panel["dialogue"] = dialogue
					}

					if req.Msg.PanelData.Environment != "" {
						panel["environment"] = req.Msg.PanelData.Environment
					}

					if req.Msg.PanelData.VisualNote != "" {
						panel["visual"] = req.Msg.PanelData.VisualNote
					}

					if req.Msg.PanelData.CameraDirection != "" {
						panel["cameraDirection"] = req.Msg.PanelData.CameraDirection
					}

					if req.Msg.PanelData.DurationSeconds > 0 {
						panel["durationSeconds"] = req.Msg.PanelData.DurationSeconds
					}

					if req.Msg.PanelData.CutNumber != "" {
						panel["cutNumber"] = req.Msg.PanelData.CutNumber
					}

					if req.Msg.PanelData.Shot != "" {
						panel["shot"] = req.Msg.PanelData.Shot
					}

					if req.Msg.PanelData.RunwayPrompt != "" {
						panel["runwayPrompt"] = req.Msg.PanelData.RunwayPrompt
					}

					if req.Msg.PanelData.GeneratedImageUrl != "" {
						panel["generatedImageUrl"] = req.Msg.PanelData.GeneratedImageUrl
					}

					if req.Msg.PanelData.ImagePrompt != "" {
						panel["gh:imagePrompt"] = req.Msg.PanelData.ImagePrompt
					}

					if req.Msg.PanelData.MangaLayout != nil {
						mangaLayout := map[string]interface{}{}
						if req.Msg.PanelData.MangaLayout.Panels != nil {
							mangaPanels := make([]interface{}, len(req.Msg.PanelData.MangaLayout.Panels))
							for j, p := range req.Msg.PanelData.MangaLayout.Panels {
								mangaPanels[j] = map[string]interface{}{
									"panelIndex": p.PanelIndex,
									"x":          p.X,
									"y":          p.Y,
									"width":      p.Width,
									"height":     p.Height,
									"shape":      p.Shape,
									"zIndex":     p.ZIndex,
									"imageX":     p.ImageX,
									"imageY":     p.ImageY,
									"imageScale": p.ImageScale,
								}
							}
							mangaLayout["panels"] = mangaPanels
						}
						if req.Msg.PanelData.MangaLayout.Texts != nil {
							mangaTexts := make([]interface{}, len(req.Msg.PanelData.MangaLayout.Texts))
							for j, t := range req.Msg.PanelData.MangaLayout.Texts {
								mangaTexts[j] = map[string]interface{}{
									"text":     t.Text,
									"type":     t.Type,
									"x":        t.X,
									"y":        t.Y,
									"fontSize": t.FontSize,
									"style":    t.Style,
								}
							}
							mangaLayout["texts"] = mangaTexts
						}
						panel["gh:mangaLayout"] = mangaLayout
					}

					// Handle generated images history
					// Always save generatedImages if provided (even if empty, to clear history)
					log.Printf("UpdatePanel: Received GeneratedImages: len=%d, episode=%s page=%d panel=%d", 
						len(req.Msg.PanelData.GeneratedImages), req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)
					if req.Msg.PanelData.GeneratedImages != nil {
						if len(req.Msg.PanelData.GeneratedImages) > 0 {
							generatedImages := make([]interface{}, len(req.Msg.PanelData.GeneratedImages))
							for j, img := range req.Msg.PanelData.GeneratedImages {
								generatedImages[j] = map[string]interface{}{
									"gh:imageUrl":   img.ImageUrl,
									"gh:imagePrompt": img.ImagePrompt,
									"gh:generatedAt": img.GeneratedAt,
									"gh:model":      img.Model,
								}
								log.Printf("UpdatePanel: Image %d: url=%s, prompt=%s, generatedAt=%d, model=%s", 
									j, img.ImageUrl, img.ImagePrompt, img.GeneratedAt, img.Model)
							}
							panel["gh:generatedImages"] = generatedImages
							log.Printf("UpdatePanel: Saved %d generated images for episode=%s page=%d panel=%d", 
								len(generatedImages), req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)
						} else {
							// Save empty array to clear history
							panel["gh:generatedImages"] = []interface{}{}
							log.Printf("UpdatePanel: Saved empty generatedImages array (clearing history) for episode=%s page=%d panel=%d", 
								req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)
						}
					} else {
						log.Printf("UpdatePanel: GeneratedImages is nil (not updating) for episode=%s page=%d panel=%d", 
							req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)
					}

					// Handle current image index
					if req.Msg.PanelData.CurrentImageIndex >= 0 {
						panel["gh:currentImageIndex"] = req.Msg.PanelData.CurrentImageIndex
					} else if req.Msg.PanelData.GeneratedImages != nil && len(req.Msg.PanelData.GeneratedImages) > 0 {
						// Default to last image if index not set
						panel["gh:currentImageIndex"] = len(req.Msg.PanelData.GeneratedImages) - 1
					}

					if req.Msg.PanelData.CameraDirection != "" {
						panel["gh:cameraDirection"] = req.Msg.PanelData.CameraDirection
					}

					if req.Msg.PanelData.DurationSeconds > 0 {
						panel["gh:durationSeconds"] = req.Msg.PanelData.DurationSeconds
					}

					if req.Msg.PanelData.CutNumber != "" {
						panel["gh:cutNumber"] = req.Msg.PanelData.CutNumber
					}

					if req.Msg.PanelData.Shot != "" {
						panel["shot"] = req.Msg.PanelData.Shot
					}

					if req.Msg.PanelData.RunwayPrompt != "" {
						panel["gh:runwayPrompt"] = req.Msg.PanelData.RunwayPrompt
					}

					if req.Msg.PanelData.GeneratedImageUrl != "" {
						panel["gh:generatedImageUrl"] = req.Msg.PanelData.GeneratedImageUrl
					}

					if req.Msg.PanelData.ImagePrompt != "" {
						panel["gh:imagePrompt"] = req.Msg.PanelData.ImagePrompt
					}

					panels[i] = panel
					found = true
					break
				}
			}
			if found {
				break
			}
		}
		if found {
			break
		}
	}

	if !found {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("panel not found"))
	}

	// Save specific episode file (Pattern 2)
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}
	epID := strings.TrimPrefix(req.Msg.EpisodeId, "episode:")
	epPath := filepath.Join(workspaceRoot, "260123-jump", "resources/episodes", epID, "episode.jsonld")
	
	// Find the episode data in the master map to save it individually
	var targetEpisode map[string]interface{}
	for _, e := range episodes {
		if episode, ok := e.(map[string]interface{}); ok && episode["gh:episodeId"] == req.Msg.EpisodeId {
			targetEpisode = episode
			break
		}
	}
	
	if targetEpisode != nil {
		// Add context back for individual file
		epToSave := map[string]interface{}{
			"@context": storyboard["@context"],
		}
		for k, v := range targetEpisode {
			// Don't save the sourceFile link inside the individual file itself
			if k != "gh:sourceFile" {
				epToSave[k] = v
			}
		}
		epContent, _ := json.MarshalIndent(epToSave, "", "  ")
		os.WriteFile(epPath, epContent, 0644)
		log.Printf("UpdatePanel: Saved individual episode file: %s", epPath)
	}

	// NOTE: We do NOT save the aggregated 'storyboard' map back to filePath (storyboard.jsonld)
	// because storyboard.jsonld should only contain the Linked Data references (links).
	// The individual files are the source of truth for the data.

	// Broadcast update to other clients
	s.broadcastUpdate(&storyboardpb.StreamUpdatesResponse{
		UpdateType:      "panel_updated",
		EpisodeId:       req.Msg.EpisodeId,
		PageNumber:      req.Msg.PageNumber,
		Panel:           req.Msg.Panel,
		PanelData:       req.Msg.PanelData,
		SenderSessionId: req.Msg.SessionId,
	})

	return connect.NewResponse(&storyboardpb.UpdatePanelResponse{
		Success: true,
		Message: "Panel updated successfully",
	}), nil
}

func (s *StoryboardService) SaveStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardpb.SaveStoryboardRequest],
) (*connect.Response[storyboardpb.SaveStoryboardResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	// Validate JSON-LD
	var storyboard map[string]interface{}
	if err := json.Unmarshal([]byte(req.Msg.JsonldContent), &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid JSON-LD: %w", err))
	}

	if err := os.WriteFile(filePath, []byte(req.Msg.JsonldContent), fs.FileMode(0644)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save storyboard: %w", err))
	}

	return connect.NewResponse(&storyboardpb.SaveStoryboardResponse{
		Success: true,
		Message: "Storyboard saved successfully",
	}), nil
}

func (s *StoryboardService) GetEpisodes(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetEpisodesRequest],
) (*connect.Response[storyboardpb.GetEpisodesResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.aggregateMaster(filePath)
	if err != nil {
		log.Printf("GetEpisodes: aggregation failed: %v", err)
		// Fallback to direct load
		storyboard, err = s.validateAndLoad(filePath)
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
		}
	}

	episodeList, ok := storyboard["gh:episodes"].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodesResponse{
			Episodes: []*storyboardpb.Episode{},
		}), nil
	}

	episodes := make([]*storyboardpb.Episode, 0, len(episodeList))
	for _, e := range episodeList {
		episode, ok := e.(map[string]interface{})
		if !ok {
			continue
		}

		id, _ := episode["gh:episodeId"].(string)
		title, _ := episode["dct:title"].(string)
		
		totalPages := int32(0)
		if pages, ok := episode["gh:pages"].([]interface{}); ok {
			totalPages = int32(len(pages))
		}

		episodes = append(episodes, &storyboardpb.Episode{
			Id:         id,
			Title:      title,
			TotalPages: totalPages,
		})
	}

	return connect.NewResponse(&storyboardpb.GetEpisodesResponse{
		Episodes: episodes,
	}), nil
}

func (s *StoryboardService) GetArcs(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetArcsRequest],
) (*connect.Response[storyboardpb.GetArcsResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.aggregateMaster(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	arcsData, ok := storyboard["gh:arcs"].(map[string]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetArcsResponse{
			Arcs: []*storyboardpb.Arc{},
		}), nil
	}

	episodeList, ok := arcsData["gh:episodes"].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetArcsResponse{
			Arcs: []*storyboardpb.Arc{},
		}), nil
	}

	arcs := make([]*storyboardpb.Arc, 0, len(episodeList))
	for _, e := range episodeList {
		arcMap, ok := e.(map[string]interface{})
		if !ok {
			continue
		}

		id, _ := arcMap["gh:arc"].(string)
		desc, _ := arcMap["gh:description"].(string)
		
		var epIDs []string
		if ids, ok := arcMap["gh:episodeIds"].([]interface{}); ok {
			epIDs = make([]string, len(ids))
			for i, idVal := range ids {
				if s, ok := idVal.(string); ok {
					epIDs[i] = s
				}
			}
		}

		arcs = append(arcs, &storyboardpb.Arc{
			Id:          id,
			Title:       id, // Using ID as title for now as it's "Arc 0", "Arc A", etc.
			Description: desc,
			EpisodeIds:  epIDs,
		})
	}

	return connect.NewResponse(&storyboardpb.GetArcsResponse{
		Arcs: arcs,
	}), nil
}

func (s *StoryboardService) GetArcPanels(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetArcPanelsRequest],
) (*connect.Response[storyboardpb.GetArcPanelsResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.aggregateMaster(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	// Find the arc to get its episode IDs
	arcsData, ok := storyboard["gh:arcs"].(map[string]interface{})
	if !ok {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("arcs data not found"))
	}

	episodeList, ok := arcsData["gh:episodes"].([]interface{})
	if !ok {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("arcs episode list not found"))
	}

	var targetEpisodeIDs []string
	for _, e := range episodeList {
		arcMap, ok := e.(map[string]interface{})
		if !ok {
			continue
		}
		if arcMap["gh:arc"] == req.Msg.ArcId {
			if ids, ok := arcMap["gh:episodeIds"].([]interface{}); ok {
				targetEpisodeIDs = make([]string, len(ids))
				for i, idVal := range ids {
					if s, ok := idVal.(string); ok {
						targetEpisodeIDs[i] = s
					}
				}
			}
			break
		}
	}

	if len(targetEpisodeIDs) == 0 {
		return connect.NewResponse(&storyboardpb.GetArcPanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	// Get all panels for all episodes in this arc
	allPanels := make([]*storyboardpb.Panel, 0)
	
	episodes, ok := storyboard["gh:episodes"].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetArcPanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	// Map of episode ID to its data for quick lookup
	epMap := make(map[string]map[string]interface{})
	for _, e := range episodes {
		if ep, ok := e.(map[string]interface{}); ok {
			if id, ok := ep["gh:episodeId"].(string); ok {
				epMap[id] = ep
			}
		}
	}

	for _, epID := range targetEpisodeIDs {
		targetEpisode, ok := epMap[epID]
		if !ok {
			continue
		}

		pages, ok := targetEpisode["gh:pages"].([]interface{})
		if !ok {
			continue
		}

		for _, pg := range pages {
			page, ok := pg.(map[string]interface{})
			if !ok {
				continue
			}

			pageNum, _ := page["gh:pageNumber"].(float64)
			pagePanels, ok := page["gh:panels"].([]interface{})
			if !ok {
				continue
			}

			for _, p := range pagePanels {
				panel, ok := p.(map[string]interface{})
				if !ok {
					continue
				}

				panelIndex, _ := panel["panel"].(float64)
				
				// Reusing the panel data extraction logic would be better, 
				// but for now let's keep it simple or refactor later.
				// For this task, I'll implement a helper or just copy-paste for speed.
				// (Refactoring to a helper function would be cleaner)
				
				pObj := s.extractPanelData(panel, int32(pageNum), int32(panelIndex))
				allPanels = append(allPanels, pObj)
			}
		}
	}

	return connect.NewResponse(&storyboardpb.GetArcPanelsResponse{
		Panels: allPanels,
	}), nil
}

// Helper to extract panel data (refactored from GetEpisodePanels)
func (s *StoryboardService) extractPanelData(panel map[string]interface{}, pageNum int32, panelIndex int32) *storyboardpb.Panel {
	panelData := &storyboardpb.PanelData{}

	// Extract characters
	if chars, ok := panel["characters"].([]interface{}); ok {
		panelData.Characters = make([]string, len(chars))
		for i, c := range chars {
			if charID, ok := c.(string); ok {
				panelData.Characters[i] = charID
			}
		}
	}

	// Extract dialogue
	if dialogues, ok := panel["dialogue"].([]interface{}); ok {
		panelData.Dialogue = make([]*storyboardpb.Dialogue, 0, len(dialogues))
		for _, d := range dialogues {
			dialogue, ok := d.(map[string]interface{})
			if !ok {
				continue
			}
			speaker, _ := dialogue["speaker"].(string)
			text, _ := dialogue["text"].(string)
			dObj := &storyboardpb.Dialogue{
				Speaker: speaker,
				Text:    text,
			}
			if v, ok := dialogue["gh:delivery"].(string); ok {
				dObj.Delivery = v
			}
			if v, ok := dialogue["gh:subtext"].(string); ok {
				dObj.Subtext = v
			}
			if v, ok := dialogue["gh:emotion"].(string); ok {
				dObj.Emotion = v
			}
			if v, ok := dialogue["gh:pauseBeforeMs"].(float64); ok {
				dObj.PauseBeforeMs = int32(v)
			}
			if v, ok := dialogue["gh:pauseAfterMs"].(float64); ok {
				dObj.PauseAfterMs = int32(v)
			}
			if ml, ok := dialogue["gh:mangaLayout"].(map[string]interface{}); ok {
				mt := &storyboardpb.MangaText{}
				if val, ok := ml["text"].(string); ok {
					mt.Text = val
				}
				if val, ok := ml["type"].(string); ok {
					mt.Type = val
				}
				if val, ok := ml["x"].(float64); ok {
					mt.X = float32(val)
				}
				if val, ok := ml["y"].(float64); ok {
					mt.Y = float32(val)
				}
				if val, ok := ml["fontSize"].(float64); ok {
					mt.FontSize = float32(val)
				}
				if val, ok := ml["style"].(string); ok {
					mt.Style = val
				}
				dObj.MangaLayout = mt
			}
			panelData.Dialogue = append(panelData.Dialogue, dObj)
		}
	}

	// Extract environment
	if env, ok := panel["environment"].(string); ok {
		panelData.Environment = env
	}

	// Extract visual note
	if visual, ok := panel["visual"].(string); ok {
		panelData.VisualNote = visual
	}

	// Extract camera direction
	if cameraDir, ok := panel["gh:cameraDirection"].(string); ok {
		panelData.CameraDirection = cameraDir
	}

	// Extract duration
	if duration, ok := panel["gh:durationSeconds"].(float64); ok {
		panelData.DurationSeconds = float32(duration)
	}

	// Extract cut number
	if cutNum, ok := panel["gh:cutNumber"].(string); ok {
		panelData.CutNumber = cutNum
	}

	if shot, ok := panel["shot"].(string); ok {
		panelData.Shot = shot
	}

	if runwayPrompt, ok := panel["gh:runwayPrompt"].(string); ok {
		panelData.RunwayPrompt = runwayPrompt
	}

	if generatedImageUrl, ok := panel["gh:generatedImageUrl"].(string); ok {
		panelData.GeneratedImageUrl = generatedImageUrl
	}

	if imagePrompt, ok := panel["gh:imagePrompt"].(string); ok {
		panelData.ImagePrompt = imagePrompt
	}

	// Extract manga layout
	if ml, ok := panel["gh:mangaLayout"].(map[string]interface{}); ok {
		mangaLayout := &storyboardpb.MangaLayout{}
		if panels, ok := ml["panels"].([]interface{}); ok {
			mangaLayout.Panels = make([]*storyboardpb.MangaPanelLayout, 0, len(panels))
			for _, p := range panels {
				if pMap, ok := p.(map[string]interface{}); ok {
					mpl := &storyboardpb.MangaPanelLayout{}
					if val, ok := pMap["panelIndex"].(float64); ok {
						mpl.PanelIndex = int32(val)
					}
					if val, ok := pMap["x"].(float64); ok {
						mpl.X = float32(val)
					}
					if val, ok := pMap["y"].(float64); ok {
						mpl.Y = float32(val)
					}
					if val, ok := pMap["width"].(float64); ok {
						mpl.Width = float32(val)
					}
					if val, ok := pMap["height"].(float64); ok {
						mpl.Height = float32(val)
					}
					if val, ok := pMap["shape"].(string); ok {
						mpl.Shape = val
					}
					if val, ok := pMap["zIndex"].(float64); ok {
						mpl.ZIndex = int32(val)
					}
					if val, ok := pMap["imageX"].(float64); ok {
						mpl.ImageX = float32(val)
					}
					if val, ok := pMap["imageY"].(float64); ok {
						mpl.ImageY = float32(val)
					}
					if val, ok := pMap["imageScale"].(float64); ok {
						mpl.ImageScale = float32(val)
					}
					mangaLayout.Panels = append(mangaLayout.Panels, mpl)
				}
			}
		}
		if texts, ok := ml["texts"].([]interface{}); ok {
			mangaLayout.Texts = make([]*storyboardpb.MangaText, 0, len(texts))
			for _, t := range texts {
				if tMap, ok := t.(map[string]interface{}); ok {
					mt := &storyboardpb.MangaText{}
					if val, ok := tMap["text"].(string); ok {
						mt.Text = val
					}
					if val, ok := tMap["type"].(string); ok {
						mt.Type = val
					}
					if val, ok := tMap["x"].(float64); ok {
						mt.X = float32(val)
					}
					if val, ok := tMap["y"].(float64); ok {
						mt.Y = float32(val)
					}
					if val, ok := tMap["fontSize"].(float64); ok {
						mt.FontSize = float32(val)
					}
					if val, ok := tMap["style"].(string); ok {
						mt.Style = val
					}
					mangaLayout.Texts = append(mangaLayout.Texts, mt)
				}
			}
		}
		panelData.MangaLayout = mangaLayout
	}

	// Load generated images history
	if generatedImages, ok := panel["gh:generatedImages"].([]interface{}); ok {
		panelData.GeneratedImages = make([]*storyboardpb.GeneratedImage, 0, len(generatedImages))
		for _, img := range generatedImages {
			imgMap, ok := img.(map[string]interface{})
			if !ok {
				continue
			}
			generatedImg := &storyboardpb.GeneratedImage{}
			if url, ok := imgMap["gh:imageUrl"].(string); ok {
				generatedImg.ImageUrl = url
			}
			if prompt, ok := imgMap["gh:imagePrompt"].(string); ok {
				generatedImg.ImagePrompt = prompt
			}
			if timestamp, ok := imgMap["gh:generatedAt"].(float64); ok {
				generatedImg.GeneratedAt = int64(timestamp)
			}
			if model, ok := imgMap["gh:model"].(string); ok {
				generatedImg.Model = model
			}
			panelData.GeneratedImages = append(panelData.GeneratedImages, generatedImg)
		}
	}

	// Load current image index
	if idx, ok := panel["gh:currentImageIndex"].(float64); ok {
		panelData.CurrentImageIndex = int32(idx)
	} else if len(panelData.GeneratedImages) > 0 {
		// Default to last image if index not set
		panelData.CurrentImageIndex = int32(len(panelData.GeneratedImages) - 1)
	}

	// Set current image URL from history if available
	if len(panelData.GeneratedImages) > 0 && panelData.CurrentImageIndex >= 0 && int(panelData.CurrentImageIndex) < len(panelData.GeneratedImages) {
		panelData.GeneratedImageUrl = panelData.GeneratedImages[panelData.CurrentImageIndex].ImageUrl
	}

	return &storyboardpb.Panel{
		PageNumber: pageNum,
		Panel:      panelIndex,
		CutNumber:  panelData.CutNumber,
		Data:       panelData,
	}
}

func (s *StoryboardService) GetEpisodePanels(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetEpisodePanelsRequest],
) (*connect.Response[storyboardpb.GetEpisodePanelsResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.aggregateMaster(filePath)
	if err != nil {
		log.Printf("GetEpisodePanels: aggregation failed: %v", err)
		// Fallback to direct load
		storyboard, err = s.validateAndLoad(filePath)
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
		}
	}

	episodeList, ok := storyboard["gh:episodes"].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	var targetEpisode map[string]interface{}
	for _, e := range episodeList {
		episode, ok := e.(map[string]interface{})
		if !ok {
			continue
		}
		if episode["gh:episodeId"] == req.Msg.EpisodeId {
			targetEpisode = episode
			break
		}
	}

	if targetEpisode == nil {
		return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	pages, ok := targetEpisode["gh:pages"].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	panels := make([]*storyboardpb.Panel, 0)
	for _, pg := range pages {
		page, ok := pg.(map[string]interface{})
		if !ok {
			continue
		}

		pageNum, _ := page["gh:pageNumber"].(float64)
		// If PageNumber is 0 or not specified, return all pages
		// Otherwise, filter by the specified page number
		if req.Msg.PageNumber > 0 && int32(pageNum) != req.Msg.PageNumber {
			continue
		}

		pagePanels, ok := page["gh:panels"].([]interface{})
		if !ok {
			continue
		}

		for _, p := range pagePanels {
			panel, ok := p.(map[string]interface{})
			if !ok {
				continue
			}

			panelIndex, _ := panel["panel"].(float64)
			pObj := s.extractPanelData(panel, int32(pageNum), int32(panelIndex))
			panels = append(panels, pObj)
		}
	}

	return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
		Panels: panels,
	}), nil
}

func (s *StoryboardService) StreamUpdates(
	ctx context.Context,
	req *connect.Request[storyboardpb.StreamUpdatesRequest],
	stream *connect.ServerStream[storyboardpb.StreamUpdatesResponse],
) error {
	sessionID := req.Msg.SessionId
	if sessionID == "" {
		return connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("session_id is required"))
	}

	updateChan := make(chan *storyboardpb.StreamUpdatesResponse, 10)
	
	s.mu.Lock()
	s.subscribers[sessionID] = updateChan
	s.mu.Unlock()

	log.Printf("StreamUpdates: client connected: %s", sessionID)

	defer func() {
		s.mu.Lock()
		delete(s.subscribers, sessionID)
		s.mu.Unlock()
		close(updateChan)
		log.Printf("StreamUpdates: client disconnected: %s", sessionID)
	}()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case update := <-updateChan:
			if err := stream.Send(update); err != nil {
				return err
			}
		}
	}
}

func (s *StoryboardService) broadcastUpdate(update *storyboardpb.StreamUpdatesResponse) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for sessionID, ch := range s.subscribers {
		// Don't send back to the sender if it's a panel update
		if update.UpdateType == "panel_updated" && sessionID == update.SenderSessionId {
			continue
		}
		
		select {
		case ch <- update:
			// Sent successfully
		default:
			log.Printf("broadcastUpdate: skipping slow subscriber: %s", sessionID)
		}
	}
}

// BroadcastChatMessage allows external components (like Temporal workers) to send messages to the chat
func (s *StoryboardService) BroadcastChatMessage(role, agentMode, content string) {
	s.broadcastUpdate(&storyboardpb.StreamUpdatesResponse{
		UpdateType: "chat_message",
		ChatMessage: &storyboardpb.ChatMessage{
			Role:      role,
			AgentMode: agentMode,
			Content:   content,
		},
	})
}

// InternalBroadcastChatMessage is the RPC version of BroadcastChatMessage
func (s *StoryboardService) InternalBroadcastChatMessage(
	ctx context.Context,
	req *connect.Request[storyboardpb.InternalBroadcastChatMessageRequest],
) (*connect.Response[storyboardpb.InternalBroadcastChatMessageResponse], error) {
	role := req.Msg.Role
	if role == "" {
		role = "assistant"
	}
	s.BroadcastChatMessage(role, req.Msg.AgentMode, req.Msg.Content)
	return connect.NewResponse(&storyboardpb.InternalBroadcastChatMessageResponse{
		Success: true,
	}), nil
}

// AnalyzeStructure analyzes the structure of an episode
func (s *StoryboardService) AnalyzeStructure(
	ctx context.Context,
	req *connect.Request[storyboardpb.AnalyzeStructureRequest],
) (*connect.Response[storyboardpb.AnalyzeStructureResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.aggregateMaster(filePath)
	if err != nil {
		log.Printf("AnalyzeStructure: aggregation failed: %v", err)
		// Fallback to direct load
		storyboard, err = s.validateAndLoad(filePath)
		if err != nil {
			return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
		}
	}

	episode := findEpisode(storyboard, req.Msg.EpisodeId)
	if episode == nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("episode not found"))
	}

	validation := ValidateEpisodeStructure(episode)

	readingUnits := 0
	if ru, ok := validation.Metrics["readingUnits"].(int); ok {
		readingUnits = ru
	}

	dialogueRatio := 0.0
	if dr, ok := validation.Metrics["dialogueRatio"].(float64); ok {
		dialogueRatio = dr
	}

	beatCount := 0
	if beats, ok := episode["gh:beats"].([]interface{}); ok {
		beatCount = len(beats)
	}

	metrics := &storyboardpb.StructuralMetrics{
		ReadingUnits:     int32(readingUnits),
		DialogueRatio:    float32(dialogueRatio),
		BeatCount:        int32(beatCount),
		PanelCount:       int32(countTotalPanels(episode)),
		ValidationErrors: validation.Errors,
	}

	return connect.NewResponse(&storyboardpb.AnalyzeStructureResponse{
		Success: true,
		Message: "Analysis complete",
		Metrics: metrics,
	}), nil
}

func (s *StoryboardService) extractMetadata(storyboard map[string]interface{}) *storyboardpb.StoryboardMetadata {
	metadata := &storyboardpb.StoryboardMetadata{}

	if title, ok := storyboard["dct:title"].(string); ok {
		metadata.Title = title
	}

	if desc, ok := storyboard["dct:description"].(string); ok {
		metadata.Description = desc
	}

	if episodes, ok := storyboard["gh:episodes"].([]interface{}); ok {
		episodeIDs := make([]string, 0, len(episodes))
		for _, e := range episodes {
			if ep, ok := e.(map[string]interface{}); ok {
				if id, ok := ep["gh:episodeId"].(string); ok {
					episodeIDs = append(episodeIDs, id)
				}
			}
		}
		metadata.Episodes = episodeIDs
	}

	return metadata
}

// ExportPdf exports the storyboard to a PDF file with images
func (s *StoryboardService) ExportPdf(
	ctx context.Context,
	req *connect.Request[storyboardpb.ExportPdfRequest],
) (*connect.Response[storyboardpb.ExportPdfResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	// Determine workspace root for image paths
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}

	var panels []*storyboardpb.Panel
	var title string

	if req.Msg.ArcId != "" {
		res, err := s.GetArcPanels(ctx, connect.NewRequest(&storyboardpb.GetArcPanelsRequest{
			FilePath: filePath,
			ArcId:    req.Msg.ArcId,
		}))
		if err != nil {
			return nil, err
		}
		panels = res.Msg.Panels
		title = req.Msg.ArcId
	} else if req.Msg.EpisodeId != "" {
		res, err := s.GetEpisodePanels(ctx, connect.NewRequest(&storyboardpb.GetEpisodePanelsRequest{
			FilePath:  filePath,
			EpisodeId: req.Msg.EpisodeId,
		}))
		if err != nil {
			return nil, err
		}
		panels = res.Msg.Panels
		title = req.Msg.EpisodeId
	} else {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("episode_id or arc_id is required"))
	}

	if len(panels) == 0 {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("no panels found to export"))
	}

	// Generate PDF with manga page size (B5 portrait: 176mm x 250mm)
	cfg := config.NewBuilder().
		WithPageNumber().
		WithDimensions(176, 250).
		WithLeftMargin(5).
		WithTopMargin(5).
		WithRightMargin(5).
		WithBottomMargin(10).
		Build()

	m := maroto.New(cfg)

	// Title Page
	m.AddRows(
		row.New(30).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("Storyboard: %s", title), props.Text{
					Top:   10,
					Size:  16,
					Style: fontstyle.Bold,
					Align: align.Center,
				}),
			),
		),
		row.New(15).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("Mode: %s", req.Msg.Mode), props.Text{
					Size:  10,
					Align: align.Center,
				}),
			),
		),
		row.New(15).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("Generated at: %s", time.Now().Format("2006-01-02 15:04:05")), props.Text{
					Size:  8,
					Align: align.Center,
				}),
			),
		),
	)

	// Group panels by page
	groups := make(map[int32][]*storyboardpb.Panel)
	var pageNums []int32
	for _, p := range panels {
		if _, ok := groups[p.PageNumber]; !ok {
			pageNums = append(pageNums, p.PageNumber)
		}
		groups[p.PageNumber] = append(groups[p.PageNumber], p)
	}

	// Sort page numbers
	sort.Slice(pageNums, func(i, j int) bool {
		return pageNums[i] < pageNums[j]
	})

	// Render each manga page
	for _, pageNum := range pageNums {
		pagePanels := groups[pageNum]
		panelCount := len(pagePanels)
		
		// Add page header
		m.AddRows(row.New(6).Add(col.New(12).Add(text.New(fmt.Sprintf("Page %d", pageNum), props.Text{Style: fontstyle.Bold, Size: 10, Align: align.Center}))))

		// Render panels based on count - mimicking manga layout patterns
		switch {
		case panelCount == 1:
			// Single full-width panel
			r := row.New(200)
			r.Add(s.buildPanelColWithImage(pagePanels[0], workspaceRoot))
			m.AddRows(r)
			
		case panelCount == 2:
			// Two panels stacked vertically
			for _, p := range pagePanels {
				r := row.New(95)
				r.Add(s.buildPanelColFull(p, workspaceRoot))
				m.AddRows(r)
			}
			
		case panelCount == 3:
			// Top panel full width, bottom two side by side
			r1 := row.New(90)
			r1.Add(s.buildPanelColFull(pagePanels[0], workspaceRoot))
			m.AddRows(r1)
			
			r2 := row.New(90)
			r2.Add(s.buildPanelColWithImage(pagePanels[1], workspaceRoot))
			r2.Add(s.buildPanelColWithImage(pagePanels[2], workspaceRoot))
			m.AddRows(r2)
			
		case panelCount == 4:
			// 2x2 grid
			for i := 0; i < 4; i += 2 {
				r := row.New(95)
				r.Add(s.buildPanelColWithImage(pagePanels[i], workspaceRoot))
				if i+1 < panelCount {
					r.Add(s.buildPanelColWithImage(pagePanels[i+1], workspaceRoot))
				}
				m.AddRows(r)
			}
			
		case panelCount >= 5 && panelCount <= 6:
			// First panel large, rest in 2-column grid
			r1 := row.New(70)
			r1.Add(s.buildPanelColFull(pagePanels[0], workspaceRoot))
			m.AddRows(r1)
			
			for i := 1; i < panelCount; i += 2 {
				r := row.New(55)
				r.Add(s.buildPanelColWithImage(pagePanels[i], workspaceRoot))
				if i+1 < panelCount {
					r.Add(s.buildPanelColWithImage(pagePanels[i+1], workspaceRoot))
				} else {
					r.Add(col.New(6))
				}
				m.AddRows(r)
			}
			
		default:
			// Many panels - 3-column grid
			for i := 0; i < panelCount; i += 3 {
				r := row.New(60)
				for j := 0; j < 3 && i+j < panelCount; j++ {
					r.Add(s.buildPanelColThird(pagePanels[i+j], workspaceRoot))
				}
				// Fill remaining columns
				remaining := 3 - min(3, panelCount-i)
				for k := 0; k < remaining; k++ {
					r.Add(col.New(4))
				}
				m.AddRows(r)
			}
		}
	}

	doc, err := m.Generate()
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate PDF: %w", err))
	}

	pdfBytes := doc.GetBytes()
	filename := fmt.Sprintf("storyboard_%s_%s.pdf", title, req.Msg.Mode)

	return connect.NewResponse(&storyboardpb.ExportPdfResponse{
		Success:    true,
		Message:    "PDF generated successfully",
		PdfContent: pdfBytes,
		Filename:   filename,
	}), nil
}

// buildPanelColFull creates a full-width column (12 grid units) with panel image
func (s *StoryboardService) buildPanelColFull(p *storyboardpb.Panel, workspaceRoot string) core.Col {
	return s.buildPanelColSize(p, workspaceRoot, 12, 600, 400)
}

// buildPanelColThird creates a 1/3 width column (4 grid units) with panel image
func (s *StoryboardService) buildPanelColThird(p *storyboardpb.Panel, workspaceRoot string) core.Col {
	return s.buildPanelColSize(p, workspaceRoot, 4, 300, 200)
}

// buildPanelColWithImage creates a half-width column (6 grid units) with panel image
func (s *StoryboardService) buildPanelColWithImage(p *storyboardpb.Panel, workspaceRoot string) core.Col {
	return s.buildPanelColSize(p, workspaceRoot, 6, 400, 300)
}

// buildPanelColSize creates a column with specified size and panel image
func (s *StoryboardService) buildPanelColSize(p *storyboardpb.Panel, workspaceRoot string, gridSize, maxWidth, maxHeight int) core.Col {
	c := col.New(gridSize)
	
	// Try to add image if available
	imageAdded := false
	if p.Data != nil && len(p.Data.GeneratedImages) > 0 {
		// Get the current or latest image
		imgIdx := int(p.Data.CurrentImageIndex)
		if imgIdx < 0 || imgIdx >= len(p.Data.GeneratedImages) {
			imgIdx = len(p.Data.GeneratedImages) - 1
		}
		
		imgURL := p.Data.GeneratedImages[imgIdx].ImageUrl
		if imgURL != "" {
			// Convert URL path to file path
			// imgURL is like "/images/episodes/episode:arc0-1-origin/pages/0/p0n1-dark-room_v2.png"
			// Remove leading slash and join with resources path
			cleanURL := strings.TrimPrefix(imgURL, "/")
			imgPath := filepath.Join(workspaceRoot, "260123-jump", "resources", cleanURL)
			
			// Read and resize image for PDF
			resizedData, err := resizeImageForPDF(imgPath, maxWidth, maxHeight)
			if err == nil {
				c.Add(image.NewFromBytes(resizedData, extension.Jpg, props.Rect{
					Center:  true,
					Percent: 95,
				}))
				imageAdded = true
			} else {
				log.Printf("Warning: could not process image %s: %v", imgPath, err)
			}
		}
	}
	
	// Add panel number
	c.Add(text.New(fmt.Sprintf("Panel %d", p.Panel), props.Text{
		Style: fontstyle.Bold,
		Size:  8,
		Top:   0,
	}))
	
	// Add visual note if no image
	if !imageAdded && p.Data != nil && p.Data.VisualNote != "" {
		visual := p.Data.VisualNote
		if len(visual) > 80 {
			visual = visual[:77] + "..."
		}
		c.Add(text.New(visual, props.Text{
			Top:  10,
			Size: 7,
		}))
	}

	// Add dialogue summary
	if p.Data != nil && len(p.Data.Dialogue) > 0 {
		var dialogueLines []string
		for _, d := range p.Data.Dialogue {
			line := fmt.Sprintf("%s: %s", d.Speaker, d.Text)
			if len(line) > 40 {
				line = line[:37] + "..."
			}
			dialogueLines = append(dialogueLines, line)
			if len(dialogueLines) >= 2 {
				break
			}
		}
		dialogueText := strings.Join(dialogueLines, " / ")
		
		topOffset := float64(60)
		if imageAdded {
			topOffset = 65
		}
		c.Add(text.New(dialogueText, props.Text{
			Top:   topOffset,
			Size:  6,
			Color: &props.Color{Red: 0, Green: 80, Blue: 0},
		}))
	}

	return c
}

// buildPanelCol creates a simple text-only column (for backwards compatibility)
func (s *StoryboardService) buildPanelCol(p *storyboardpb.Panel) core.Col {
	visual := "-"
	if p.Data != nil && p.Data.VisualNote != "" {
		visual = p.Data.VisualNote
		if len(visual) > 100 {
			visual = visual[:97] + "..."
		}
	}

	dialogue := ""
	if p.Data != nil && len(p.Data.Dialogue) > 0 {
		d := p.Data.Dialogue[0]
		dialogue = fmt.Sprintf("%s: %s", d.Speaker, d.Text)
		if len(dialogue) > 100 {
			dialogue = dialogue[:97] + "..."
		}
	}

	return col.New(6).Add(
		text.New(fmt.Sprintf("Panel %d", p.Panel), props.Text{Style: fontstyle.Bold, Size: 10}),
		text.New(visual, props.Text{Top: 5, Size: 8}),
		text.New(dialogue, props.Text{Top: 25, Size: 8, Color: &props.Color{Red: 0, Green: 100, Blue: 0}}),
	)
}

// resizeImageForPDF reads an image file, resizes it to fit within maxWidth x maxHeight, and returns JPEG bytes
func resizeImageForPDF(imgPath string, maxWidth, maxHeight int) ([]byte, error) {
	// Read the entire file to detect format
	data, err := os.ReadFile(imgPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %w", err)
	}

	// Detect actual image format using magic bytes
	reader := bytes.NewReader(data)
	
	// Try to decode using Go's generic image decoder which auto-detects format
	img, format, err := goimage.Decode(reader)
	if err != nil {
		// If generic decode fails, try specific decoders
		reader.Seek(0, 0)
		img, err = png.Decode(reader)
		if err != nil {
			reader.Seek(0, 0)
			img, err = jpeg.Decode(reader)
			if err != nil {
				return nil, fmt.Errorf("failed to decode image (tried png, jpeg): %w", err)
			}
			format = "jpeg"
		} else {
			format = "png"
		}
	}
	
	log.Printf("Image %s decoded as %s format", filepath.Base(imgPath), format)

	// Calculate new dimensions while maintaining aspect ratio
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()
	
	newWidth := origWidth
	newHeight := origHeight
	
	// Scale down if larger than max dimensions
	if origWidth > maxWidth || origHeight > maxHeight {
		widthRatio := float64(maxWidth) / float64(origWidth)
		heightRatio := float64(maxHeight) / float64(origHeight)
		ratio := widthRatio
		if heightRatio < widthRatio {
			ratio = heightRatio
		}
		newWidth = int(float64(origWidth) * ratio)
		newHeight = int(float64(origHeight) * ratio)
	}

	// Create resized image
	resized := goimage.NewRGBA(goimage.Rect(0, 0, newWidth, newHeight))
	draw.CatmullRom.Scale(resized, resized.Bounds(), img, bounds, draw.Over, nil)

	// Encode as JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, resized, &jpeg.Options{Quality: 85})
	if err != nil {
		return nil, fmt.Errorf("failed to encode image: %w", err)
	}

	return buf.Bytes(), nil
}

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
