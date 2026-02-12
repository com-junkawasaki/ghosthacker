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

	"connectrpc.com/connect"
	storyboardpb "storyboard-editor/backend/proto"
)

// SaveChatSession saves a chat session to a JSON-LD file in the chat_history folder
func (s *StoryboardService) SaveChatSession(
	ctx context.Context,
	req *connect.Request[storyboardpb.SaveChatSessionRequest],
) (*connect.Response[storyboardpb.SaveChatSessionResponse], error) {
	session := req.Msg.Session
	if session == nil || session.Id == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("session data and ID are required"))
	}

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}

	chatHistoryDir := filepath.Join(workspaceRoot, s.projectDir, "resources/chat_history")
	if err := os.MkdirAll(chatHistoryDir, fs.FileMode(0755)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to create chat history directory: %w", err))
	}

	// Prepare JSON-LD structure
	data := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh":     "https://ghosthacker.gftd.ai/ns/",
			"schema": "http://schema.org/",
			"dct":    "http://purl.org/dc/terms/",
		},
		"@type":         "gh:ChatSession",
		"@id":           "chat:" + session.Id,
		"dct:title":     session.Title,
		"schema:dateCreated": session.Timestamp,
		"gh:messages":   session.Messages,
	}

	content, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to marshal chat session: %w", err))
	}

	fileName := fmt.Sprintf("session_%s.jsonld", session.Id)
	filePath := filepath.Join(chatHistoryDir, fileName)

	if err := os.WriteFile(filePath, content, fs.FileMode(0644)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save chat session file: %w", err))
	}

	log.Printf("Chat session saved: %s", filePath)

	return connect.NewResponse(&storyboardpb.SaveChatSessionResponse{
		Success: true,
		Message: "Chat session saved successfully",
	}), nil
}

// GetChatSessions retrieves all saved chat sessions from the chat_history folder
func (s *StoryboardService) GetChatSessions(
	ctx context.Context,
	req *connect.Request[storyboardpb.GetChatSessionsRequest],
) (*connect.Response[storyboardpb.GetChatSessionsResponse], error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}

	chatHistoryDir := filepath.Join(workspaceRoot, s.projectDir, "resources/chat_history")
	if _, err := os.Stat(chatHistoryDir); os.IsNotExist(err) {
		return connect.NewResponse(&storyboardpb.GetChatSessionsResponse{
			Sessions: []*storyboardpb.ChatSessionData{},
		}), nil
	}

	files, err := os.ReadDir(chatHistoryDir)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to read chat history directory: %w", err))
	}

	sessions := make([]*storyboardpb.ChatSessionData, 0)
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".jsonld") {
			continue
		}

		content, err := os.ReadFile(filepath.Join(chatHistoryDir, file.Name()))
		if err != nil {
			continue
		}

		var data map[string]interface{}
		if err := json.Unmarshal(content, &data); err != nil {
			continue
		}

		// Extract session data
		id := strings.TrimPrefix(data["@id"].(string), "chat:")
		title, _ := data["dct:title"].(string)
		timestamp := int64(0)
		if ts, ok := data["schema:dateCreated"].(float64); ok {
			timestamp = int64(ts)
		}

		// Extract messages
		messages := make([]*storyboardpb.ChatMessage, 0)
		if msgList, ok := data["gh:messages"].([]interface{}); ok {
			for _, m := range msgList {
				mMap, ok := m.(map[string]interface{})
				if !ok {
					continue
				}
				messages = append(messages, &storyboardpb.ChatMessage{
					Role:        mMap["role"].(string),
					AgentMode:   mMap["agent_mode"].(string),
					Content:     mMap["content"].(string),
					ContextJson: mMap["context_json"].(string),
					ResolvedIds: resolvedIDsFromMap(mMap["resolved_ids"]),
					Patches:     patchesFromMap(mMap["patches"]),
					ContextScope: contextScopeFromMap(mMap["context_scope"]),
				})
			}
		}

		sessions = append(sessions, &storyboardpb.ChatSessionData{
			Id:        id,
			Title:     title,
			Timestamp: timestamp,
			Messages:  messages,
		})
	}

	// Sort by timestamp descending
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp > sessions[j].Timestamp
	})

	return connect.NewResponse(&storyboardpb.GetChatSessionsResponse{
		Sessions: sessions,
	}), nil
}

func resolvedIDsFromMap(val interface{}) []string {
	if val == nil {
		return []string{}
	}
	list, ok := val.([]interface{})
	if !ok {
		return []string{}
	}
	res := make([]string, len(list))
	for i, v := range list {
		res[i] = v.(string)
	}
	return res
}

func patchesFromMap(val interface{}) []*storyboardpb.JSONPatch {
	if val == nil {
		return nil
	}
	list, ok := val.([]interface{})
	if !ok {
		return nil
	}
	res := make([]*storyboardpb.JSONPatch, len(list))
	for i, v := range list {
		m, ok := v.(map[string]interface{})
		if !ok {
			continue
		}
		res[i] = &storyboardpb.JSONPatch{
			Op:    m["op"].(string),
			Path:  m["path"].(string),
			Value: m["value"].(string),
		}
	}
	return res
}

func contextScopeFromMap(val interface{}) *storyboardpb.ContextScope {
	if val == nil {
		return nil
	}
	m, ok := val.(map[string]interface{})
	if !ok {
		return nil
	}
	
	scope := &storyboardpb.ContextScope{}
	if eps, ok := m["episodes"].([]interface{}); ok {
		for _, e := range eps {
			scope.Episodes = append(scope.Episodes, e.(string))
		}
	}
	if pgs, ok := m["pages"].([]interface{}); ok {
		for _, p := range pgs {
			scope.Pages = append(scope.Pages, int32(p.(float64)))
		}
	}
	if pns, ok := m["panels"].([]interface{}); ok {
		for _, p := range pns {
			scope.Panels = append(scope.Panels, int32(p.(float64)))
		}
	}
	if chars, ok := m["characters"].([]interface{}); ok {
		for _, c := range chars {
			scope.Characters = append(scope.Characters, c.(string))
		}
	}
	return scope
}
