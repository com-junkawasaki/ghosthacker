package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"

	"connectrpc.com/connect"
	"storyboard-editor/backend/proto"
)

type StoryboardService struct {
	storyboardPath string
}

func NewStoryboardService(storyboardPath string) *StoryboardService {
	return &StoryboardService{
		storyboardPath: storyboardPath,
	}
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

	var storyboard map[string]interface{}
	if err := json.Unmarshal(content, &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid JSON-LD: %w", err))
	}

	metadata := s.extractMetadata(storyboard)

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

	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(content, &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid JSON-LD: %w", err))
	}

	// Update panel in panelScripts
	panelScripts, ok := storyboard["gh:panelScripts"].(map[string]interface{})
	if !ok {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("panelScripts not found"))
	}

	episodePanels, ok := panelScripts[req.Msg.EpisodeId].([]interface{})
	if !ok {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("episode %s not found", req.Msg.EpisodeId))
	}

	// Find and update the panel
	found := false
	for i, p := range episodePanels {
		panel, ok := p.(map[string]interface{})
		if !ok {
			continue
		}

		pageNum, _ := panel["gh:pageNumber"].(float64)
		panelNum, _ := panel["panel"].(float64)

		if int32(pageNum) == req.Msg.PageNumber && int32(panelNum) == req.Msg.Panel {
			// Update panel data
			if req.Msg.PanelData.Characters != nil {
				charRefs := make([]interface{}, len(req.Msg.PanelData.Characters))
				for j, charID := range req.Msg.PanelData.Characters {
					charRefs[j] = charID
				}
				panel["gh:characters"] = charRefs
			}

			if req.Msg.PanelData.Dialogue != nil {
				dialogue := make([]interface{}, len(req.Msg.PanelData.Dialogue))
				for j, d := range req.Msg.PanelData.Dialogue {
					dialogue[j] = map[string]interface{}{
						"gh:speaker": d.Speaker,
						"gh:text":    d.Text,
					}
				}
				panel["gh:dialogue"] = dialogue
			}

			if req.Msg.PanelData.Environment != "" {
				panel["environment"] = req.Msg.PanelData.Environment
			}

			if req.Msg.PanelData.CutNumber != "" {
				panel["gh:cutNumber"] = req.Msg.PanelData.CutNumber
			}

			if req.Msg.PanelData.DurationSeconds > 0 {
				panel["gh:durationSeconds"] = req.Msg.PanelData.DurationSeconds
			}

			if req.Msg.PanelData.VisualNote != "" {
				panel["gh:visualNote"] = req.Msg.PanelData.VisualNote
			}

			if req.Msg.PanelData.CameraDirection != "" {
				panel["gh:cameraDirection"] = req.Msg.PanelData.CameraDirection
			}

			episodePanels[i] = panel
			found = true
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

	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(content, &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid JSON-LD: %w", err))
	}

	panelScripts, ok := storyboard["gh:panelScripts"].(map[string]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodesResponse{
			Episodes: []*storyboardpb.Episode{},
		}), nil
	}

	episodes := make([]*storyboardpb.Episode, 0, len(panelScripts))
	for episodeID, panels := range panelScripts {
		panelList, ok := panels.([]interface{})
		if !ok {
			continue
		}

		maxPage := int32(0)
		for _, p := range panelList {
			panel, ok := p.(map[string]interface{})
			if !ok {
				continue
			}
			if pageNum, ok := panel["gh:pageNumber"].(float64); ok {
				if int32(pageNum) > maxPage {
					maxPage = int32(pageNum)
				}
			}
		}

		episodes = append(episodes, &storyboardpb.Episode{
			Id:         episodeID,
			Title:      episodeID, // TODO: Extract title from metadata if available
			TotalPages: maxPage,
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

	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("failed to read storyboard file: %w", err))
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(content, &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid JSON-LD: %w", err))
	}

	panelScripts, ok := storyboard["gh:panelScripts"].(map[string]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	episodePanels, ok := panelScripts[req.Msg.EpisodeId].([]interface{})
	if !ok {
		return connect.NewResponse(&storyboardpb.GetEpisodePanelsResponse{
			Panels: []*storyboardpb.Panel{},
		}), nil
	}

	panels := make([]*storyboardpb.Panel, 0)
	for _, p := range episodePanels {
		panel, ok := p.(map[string]interface{})
		if !ok {
			continue
		}

		pageNum, _ := panel["gh:pageNumber"].(float64)
		panelNum, _ := panel["panel"].(float64)

		if req.Msg.PageNumber > 0 && int32(pageNum) != req.Msg.PageNumber {
			continue
		}

		panelData := &storyboardpb.PanelData{}

		// Extract characters
		if chars, ok := panel["gh:characters"].([]interface{}); ok {
			panelData.Characters = make([]string, len(chars))
			for i, c := range chars {
				if charID, ok := c.(string); ok {
					panelData.Characters[i] = charID
				}
			}
		}

		// Extract dialogue
		if dialogues, ok := panel["gh:dialogue"].([]interface{}); ok {
			panelData.Dialogue = make([]*storyboardpb.Dialogue, 0, len(dialogues))
			for _, d := range dialogues {
				dialogue, ok := d.(map[string]interface{})
				if !ok {
					continue
				}
				speaker, _ := dialogue["gh:speaker"].(string)
				text, _ := dialogue["gh:text"].(string)
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

		// Extract cut number
		if cutNum, ok := panel["gh:cutNumber"].(string); ok {
			panelData.CutNumber = cutNum
		}

		// Extract duration
		if duration, ok := panel["gh:durationSeconds"].(float64); ok {
			panelData.DurationSeconds = float32(duration)
		}

		// Extract visual note
		if visualNote, ok := panel["gh:visualNote"].(string); ok {
			panelData.VisualNote = visualNote
		}

		// Extract camera direction
		if cameraDir, ok := panel["gh:cameraDirection"].(string); ok {
			panelData.CameraDirection = cameraDir
		}

		panels = append(panels, &storyboardpb.Panel{
			PageNumber: int32(pageNum),
			Panel:      int32(panelNum),
			CutNumber:  panelData.CutNumber,
			Data:       panelData,
		})
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
	// TODO: Implement real-time streaming for collaboration
	// For now, return unimplemented
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

	if panelScripts, ok := storyboard["gh:panelScripts"].(map[string]interface{}); ok {
		episodes := make([]string, 0, len(panelScripts))
		for episodeID := range panelScripts {
			episodes = append(episodes, episodeID)
		}
		metadata.Episodes = episodes
	}

	return metadata
}
