package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"

	"connectrpc.com/connect"
	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
	"storyboard-editor/backend/internal/schema"
	"storyboard-editor/backend/proto"
)

type StoryboardService struct {
	storyboardPath string
	cueCtx         *cue.Context
	schema         cue.Value
}

func NewStoryboardService(storyboardPath string) *StoryboardService {
	cueCtx := cuecontext.New()
	return &StoryboardService{
		storyboardPath: storyboardPath,
		cueCtx:         cueCtx,
		schema:         schema.GetSchema(),
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

func (s *StoryboardService) LoadStoryboard(
	ctx context.Context,
	req *connect.Request[storyboardpb.LoadStoryboardRequest],
) (*connect.Response[storyboardpb.LoadStoryboardResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	data, err := s.validateAndLoad(filePath)
	if err != nil {
		log.Printf("LoadStoryboard: validation warning: %v", err)
		// We still return the content even if validation fails for now, but log it
	}

	metadata := s.extractMetadata(data)

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
							dialogue[j] = map[string]interface{}{
								"speaker": d.Speaker,
								"text":    d.Text,
							}
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
						panel["imagePrompt"] = req.Msg.PanelData.ImagePrompt
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

	// Save updated storyboard
	updatedContent, err := json.MarshalIndent(storyboard, "", "  ")
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to marshal JSON-LD: %w", err))
	}

	if err := os.WriteFile(filePath, updatedContent, fs.FileMode(0644)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save storyboard: %w", err))
	}

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

	storyboard, err := s.validateAndLoad(filePath)
	if err != nil {
		log.Printf("GetEpisodes: validation failed: %v", err)
		// Continue even if validation fails for now
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

func (s *StoryboardService) GetEpisodePanels(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetEpisodePanelsRequest],
) (*connect.Response[storyboardpb.GetEpisodePanelsResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	storyboard, err := s.validateAndLoad(filePath)
	if err != nil {
		log.Printf("GetEpisodePanels: validation failed: %v", err)
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
					panelData.Dialogue = append(panelData.Dialogue, &storyboardpb.Dialogue{
						Speaker: speaker,
						Text:    text,
					})
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

			panels = append(panels, &storyboardpb.Panel{
				PageNumber: int32(pageNum),
				Panel:      int32(panelIndex),
				CutNumber:  panelData.CutNumber,
				Data:       panelData,
			})
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
	return connect.NewError(connect.CodeUnimplemented, fmt.Errorf("streaming not yet implemented"))
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

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
