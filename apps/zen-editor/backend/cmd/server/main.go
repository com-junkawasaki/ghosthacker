package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	_ "modernc.org/sqlite"

	"github.com/google/uuid"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/ai"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/git"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct {
	WorkspaceRoot string
	MCPServer     *server.MCPServer
	NodeEmotions  map[string]map[string]float32
	ToolHandlers  map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)
	DB            *sql.DB
	Git           *git.GitService
}

func NewEditorServer(dataRoot string) *EditorServer {
	// DB is in apps/zen-editor/zen-editor.db, which is one level up from apps/zen-editor/data
	dbPath := filepath.Join(dataRoot, "..", "zen-editor.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS storyboards (
		project_id TEXT PRIMARY KEY,
		scenes_json TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		log.Fatalf("failed to create table: %v", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS history (
		id TEXT PRIMARY KEY,
		project_id TEXT,
		parent_id TEXT,
		branch_name TEXT,
		type TEXT,
		state_json TEXT,
		message TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		log.Fatalf("failed to create history table: %v", err)
	}

	s := &EditorServer{
		WorkspaceRoot: dataRoot,
		MCPServer:     server.NewMCPServer("GhostHackerEditor", "1.0.0"),
		NodeEmotions:  initNodeEmotions(),
		ToolHandlers:  make(map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)),
		DB:            db,
		Git:           git.NewGitService(dataRoot),
	}
	s.registerMCPTools()
	return s
}

func initNodeEmotions() map[string]map[string]float32 {
	return map[string]map[string]float32{
		"character:tamaki": {"Calm": 0.8, "Joy": 0.2, "Sadness": 0.1, "Neutral": 0.9},
		"character:nei":    {"Joy": 0.7, "Excitement": 0.6, "Playfulness": 0.8},
		"setting:office":   {"Neutral": 0.8, "Boredom": 0.3, "Focus": 0.7},
		"setting:tokyo":    {"Awe": 0.5, "Connectedness": 0.6, "Nostalgia": 0.4},
	}
}

func (s *EditorServer) registerMCPTools() {
	s.ToolHandlers["open_file"] = s.handleOpenFileTool
	s.MCPServer.AddTool(mcp.NewTool("open_file", mcp.WithDescription("Opens a markdown file")), s.handleOpenFileTool)

	s.ToolHandlers["save_file"] = s.handleSaveFileTool
	s.MCPServer.AddTool(mcp.NewTool("save_file", mcp.WithDescription("Saves a markdown file")), s.handleSaveFileTool)

	s.ToolHandlers["generate_node"] = s.handleGenerateNodeTool
	s.MCPServer.AddTool(mcp.NewTool("generate_node", mcp.WithDescription("Generates story content")), s.handleGenerateNodeTool)

	s.ToolHandlers["update_node_positions"] = s.handleUpdateNodePositionsTool
	s.MCPServer.AddTool(mcp.NewTool("update_node_positions", mcp.WithDescription("Saves layout")), s.handleUpdateNodePositionsTool)

	s.ToolHandlers["analyze_links"] = s.handleAnalyzeLinksTool
	s.MCPServer.AddTool(mcp.NewTool("analyze_links", mcp.WithDescription("Analyze hidden links between nodes using AI")), s.handleAnalyzeLinksTool)

	s.ToolHandlers["save_storyboard"] = s.handleSaveStoryboardTool
	s.MCPServer.AddTool(mcp.NewTool("save_storyboard", mcp.WithDescription("Saves storyboard data to DB")), s.handleSaveStoryboardTool)

	s.ToolHandlers["get_storyboard"] = s.handleGetStoryboardTool
	s.MCPServer.AddTool(mcp.NewTool("get_storyboard", mcp.WithDescription("Loads storyboard data from DB")), s.handleGetStoryboardTool)
}

func (s *EditorServer) handleGetStoryboardTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	projectID, _ := args["project_id"].(string)

	path := filepath.Join(s.WorkspaceRoot, projectID, "wattpad/storyboard.jsonld")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return mcp.NewToolResultText("[]"), nil
		}
		return mcp.NewToolResultError(err.Error()), nil
	}

	return mcp.NewToolResultText(string(data)), nil
}

func (s *EditorServer) handleSaveStoryboardTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	projectID, _ := args["project_id"].(string)
	scenesJSON, _ := args["scenes_json"].(string)

	path := filepath.Join(s.WorkspaceRoot, projectID, "wattpad/storyboard.jsonld")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	
	var scenes []interface{}
	if err := json.Unmarshal([]byte(scenesJSON), &scenes); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	storyboard := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh":          "https://gftd.ai/ghost-hacker/ontology/",
			"schema":      "https://schema.org/",
			"scenes":      "gh:scenes",
			"visual":      "gh:visual",
			"description": "schema:description",
			"audio":       "gh:audio",
			"timing":      "gh:timing",
			"fps":         "gh:fps",
			"persons":     "gh:involvedPersons",
			"places":      "gh:involvedPlaces",
			"items":       "gh:involvedItems",
			"emotions":    "gh:emotions",
		},
		"@type":        "gh:Storyboard",
		"gh:projectId": projectID,
		"gh:scenes":    scenes,
		"updatedAt":    time.Now().Format(time.RFC3339),
	}

	updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
	if err := os.WriteFile(path, updatedData, 0644); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	if s.Git != nil {
		s.Git.CommitDocument(path, "Update storyboard JSON-LD via MCP")
	}

	return mcp.NewToolResultText("Storyboard saved successfully to local file and committed to Git"), nil
}

func (s *EditorServer) handleAnalyzeLinksTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	nodeIDs, _ := args["node_ids"].([]interface{})
	
	aiClient := &ai.OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet",
	}

	prompt := fmt.Sprintf(`Analyze the story nodes provided and find hidden semantic or causal links between them.
Nodes: %v
Return a JSON array of link suggestions: [{"from": "ID1", "to": "ID2", "relation": "type", "description": "why"}]`, nodeIDs)

	result, err := aiClient.GenerateNextScene(ctx, []string{prompt})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	return mcp.NewToolResultText(result), nil
}

func (s *EditorServer) handleUpdateNodePositionsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	positions, _ := args["positions"].([]interface{})
	projectID, _ := args["project_id"].(string)
	if projectID == "" {
		projectID = "251022" // fallback
	}
	jsonLdPath := filepath.Join(s.WorkspaceRoot, projectID, "ghost-hacker.jsonld")

	data, err := os.ReadFile(jsonLdPath)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	var g map[string]interface{}
	if err := json.Unmarshal(data, &g); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	graph, _ := g["@graph"].([]interface{})
	posMap := make(map[string]map[string]float64)
	for _, p := range positions {
		pMap := p.(map[string]interface{})
		id := pMap["id"].(string)
		x := pMap["x"].(float64)
		y := pMap["y"].(float64)
		posMap[id] = map[string]float64{"x": x, "y": y}
	}

	updatedCount := 0
	for i, item := range graph {
		itemMap := item.(map[string]interface{})
		id, _ := itemMap["@id"].(string)
		if pos, ok := posMap[id]; ok {
			itemMap["gh:x"] = pos["x"]
			itemMap["gh:y"] = pos["y"]
			graph[i] = itemMap
			delete(posMap, id)
			updatedCount++
		}
	}

	for id, pos := range posMap {
		graph = append(graph, map[string]interface{}{
			"@id":   id,
			"@type": "gh:LayoutStub",
			"gh:x":  pos["x"],
			"gh:y":  pos["y"],
		})
		updatedCount++
	}

	g["@graph"] = graph
	updatedData, _ := json.MarshalIndent(g, "", "  ")
	if err := os.WriteFile(jsonLdPath, updatedData, 0644); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	return mcp.NewToolResultText(fmt.Sprintf("Successfully updated %d node positions", updatedCount)), nil
}

func (s *EditorServer) handleGenerateNodeTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	paths, _ := args["context_paths"].([]interface{})
	newPath, _ := args["new_path"].(string)
	var contextTexts []string
	for _, p := range paths {
		path := p.(string)
		if !filepath.IsAbs(path) {
			path = filepath.Join(s.WorkspaceRoot, path)
		}
		content, err := os.ReadFile(path)
		if err == nil {
			contextTexts = append(contextTexts, string(content))
		}
	}
	aiClient := &ai.OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet",
	}
	generated, err := aiClient.GenerateNextScene(ctx, contextTexts)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	absNewPath := newPath
	if !filepath.IsAbs(absNewPath) {
		absNewPath = filepath.Join(s.WorkspaceRoot, absNewPath)
	}
	os.MkdirAll(filepath.Dir(absNewPath), 0755)
	os.WriteFile(absNewPath, []byte(generated), 0644)
	return mcp.NewToolResultText(fmt.Sprintf("Generated at %s", newPath)), nil
}

func (s *EditorServer) handleOpenFileTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	path, _ := args["path"].(string)
	if !filepath.IsAbs(path) {
		path = filepath.Join(s.WorkspaceRoot, path)
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultText(string(content)), nil
}

func (s *EditorServer) handleSaveFileTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	path, _ := args["path"].(string)
	content, _ := args["content"].(string)
	if !filepath.IsAbs(path) {
		path = filepath.Join(s.WorkspaceRoot, path)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultText("File saved successfully"), nil
}

func (s *EditorServer) GetProjectMetadata(ctx context.Context, req *connect.Request[editorpb.GetProjectMetadataRequest]) (*connect.Response[editorpb.GetProjectMetadataResponse], error) {
	log.Printf("RPC: GetProjectMetadata called for project: %s", req.Msg.ProjectId)
	manifestPath := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/manifest.json")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	var m struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Episodes    []struct {
			ID    string   `json:"id"`
			Title string   `json:"title"`
			Files []string `json:"files"`
		} `json:"episodes"`
	}
	json.Unmarshal(data, &m)
	resp := &editorpb.GetProjectMetadataResponse{Title: m.Title, Description: m.Description}
	for _, ep := range m.Episodes {
		resp.Episodes = append(resp.Episodes, &editorpb.Episode{Id: ep.ID, Title: ep.Title, Files: ep.Files})
	}
	return connect.NewResponse(resp), nil
}

func (s *EditorServer) SaveStoryboard(ctx context.Context, req *connect.Request[editorpb.SaveStoryboardRequest]) (*connect.Response[editorpb.SaveStoryboardResponse], error) {
	log.Printf("RPC: SaveStoryboard called for project: %s", req.Msg.ProjectId)
	
	path := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/storyboard.jsonld")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	
	storyboard := map[string]interface{}{
		"@context": map[string]interface{}{
			"gh":          "https://gftd.ai/ghost-hacker/ontology/",
			"schema":      "https://schema.org/",
			"scenes":      "gh:scenes",
			"visual":      "gh:visual",
			"description": "schema:description",
			"audio":       "gh:audio",
			"timing":      "gh:timing",
			"fps":         "gh:fps",
			"persons":     "gh:involvedPersons",
			"places":      "gh:involvedPlaces",
			"items":       "gh:involvedItems",
			"emotions":    "gh:emotions",
		},
		"@type":        "gh:Storyboard",
		"gh:projectId": req.Msg.ProjectId,
		"gh:scenes":    req.Msg.Scenes,
		"updatedAt":    time.Now().Format(time.RFC3339),
	}

	updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
	if err := os.WriteFile(path, updatedData, 0644); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if s.Git != nil {
		s.Git.CommitDocument(path, "Auto-save storyboard JSON-LD via gRPC")
	}

	scenesJSON, _ := json.Marshal(req.Msg.Scenes)
	s.DB.Exec(`INSERT INTO storyboards (project_id, scenes_json, updated_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP) 
		ON CONFLICT(project_id) DO UPDATE SET scenes_json = EXCLUDED.scenes_json, updated_at = CURRENT_TIMESTAMP`,
		req.Msg.ProjectId, string(scenesJSON))

	return connect.NewResponse(&editorpb.SaveStoryboardResponse{Success: true, Message: "Saved successfully to file and DB cache"}), nil
}

func (s *EditorServer) CommitHistory(ctx context.Context, req *connect.Request[editorpb.CommitHistoryRequest]) (*connect.Response[editorpb.CommitHistoryResponse], error) {
	log.Printf("RPC: CommitHistory called for project: %s, type: %s", req.Msg.ProjectId, req.Msg.Type)
	id := uuid.New().String()
	_, err := s.DB.Exec(`INSERT INTO history (id, project_id, parent_id, branch_name, type, state_json, message) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, req.Msg.ProjectId, req.Msg.ParentId, req.Msg.BranchName, req.Msg.Type, req.Msg.StateJson, req.Msg.Message)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&editorpb.CommitHistoryResponse{Id: id, Success: true}), nil
}

func (s *EditorServer) GetHistory(ctx context.Context, req *connect.Request[editorpb.GetHistoryRequest]) (*connect.Response[editorpb.GetHistoryResponse], error) {
	log.Printf("RPC: GetHistory called for project: %s, branch: %s", req.Msg.ProjectId, req.Msg.BranchName)
	rows, err := s.DB.Query(`SELECT id, type, state_json, message, branch_name, parent_id, created_at 
		FROM history WHERE project_id = ? AND (branch_name = ? OR ? = '') ORDER BY created_at DESC`,
		req.Msg.ProjectId, req.Msg.BranchName, req.Msg.BranchName)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var items []*editorpb.HistoryItem
	for rows.Next() {
		var item editorpb.HistoryItem
		if err := rows.Scan(&item.Id, &item.Type, &item.StateJson, &item.Message, &item.BranchName, &item.ParentId, &item.CreatedAt); err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		items = append(items, &item)
	}
	return connect.NewResponse(&editorpb.GetHistoryResponse{Items: items}), nil
}

func (s *EditorServer) CheckoutHistory(ctx context.Context, req *connect.Request[editorpb.CheckoutHistoryRequest]) (*connect.Response[editorpb.CheckoutHistoryResponse], error) {
	var stateJSON, hType string
	err := s.DB.QueryRow("SELECT state_json, type FROM history WHERE id = ?", req.Msg.HistoryId).Scan(&stateJSON, &hType)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	return connect.NewResponse(&editorpb.CheckoutHistoryResponse{
		Success:   true,
		StateJson: stateJSON,
		Type:      hType,
	}), nil
}

func (s *EditorServer) GetStoryboard(ctx context.Context, req *connect.Request[editorpb.GetStoryboardRequest]) (*connect.Response[editorpb.GetStoryboardResponse], error) {
	log.Printf("RPC: GetStoryboard called for project: %s", req.Msg.ProjectId)
	
	path := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/storyboard.jsonld")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			var scenesJSON string
			err := s.DB.QueryRow("SELECT scenes_json FROM storyboards WHERE project_id = ?", req.Msg.ProjectId).Scan(&scenesJSON)
			if err == sql.ErrNoRows {
				return connect.NewResponse(&editorpb.GetStoryboardResponse{}), nil
			} else if err != nil {
				return nil, connect.NewError(connect.CodeInternal, err)
			}
			var scenes []*editorpb.StoryboardScene
			json.Unmarshal([]byte(scenesJSON), &scenes)
			return connect.NewResponse(&editorpb.GetStoryboardResponse{Scenes: scenes}), nil
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var storyboard struct {
		Scenes []*editorpb.StoryboardScene `json:"gh:scenes"`
	}
	if err := json.Unmarshal(data, &storyboard); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&editorpb.GetStoryboardResponse{Scenes: storyboard.Scenes}), nil
}

func (s *EditorServer) buildGraphRAGContext(ctx context.Context, projectID string, nodeIDs []string) string {
	jsonLdPath := filepath.Join(s.WorkspaceRoot, projectID, "ghost-hacker.jsonld")
	data, err := os.ReadFile(jsonLdPath)
	if err != nil {
		return ""
	}
	var g struct {
		Graph []map[string]interface{} `json:"@graph"`
	}
	json.Unmarshal(data, &g)

	var contextParts []string
	relatedEvents := []map[string]interface{}{}
	relatedEntities := make(map[string]map[string]interface{})

	for _, item := range g.Graph {
		id, _ := item["@id"].(string)
		itemType, _ := item["@type"].(string)

		for _, targetID := range nodeIDs {
			if id == targetID {
				relatedEntities[id] = item
			}
		}

		if itemType == "gh:RelationEvent" {
			participants, _ := item["gh:participants"].([]interface{})
			isRelevant := false
			for _, p := range participants {
				pID, _ := p.(string)
				for _, targetID := range nodeIDs {
					if pID == targetID {
						isRelevant = true
						break
					}
				}
				if isRelevant {
					break
				}
			}
			if isRelevant {
				relatedEvents = append(relatedEvents, item)
			}
		}
	}

	contextParts = append(contextParts, "--- RELEVANT ENTITIES ---")
	for id, ent := range relatedEntities {
		name, _ := ent["name"].(string)
		desc, _ := ent["description"].(string)
		contextParts = append(contextParts, fmt.Sprintf("ID: %s | Name: %s | Description: %s", id, name, desc))
	}

	contextParts = append(contextParts, "\n--- RELATIONSHIP EVENTS & CONTEXT ---")
	for _, ev := range relatedEvents {
		relType, _ := ev["gh:relationType"].(string)
		participants, _ := ev["gh:participants"].([]interface{})
		evidence, _ := ev["gh:evidence"].(string)
		strength, _ := ev["gh:strength"].(float64)
		atTime, _ := ev["gh:atTime"].(string)

		pNames := []string{}
		for _, p := range participants {
			pID, _ := p.(string)
			if ent, ok := relatedEntities[pID]; ok {
				name, _ := ent["name"].(string)
				pNames = append(pNames, name)
			} else {
				pNames = append(pNames, pID)
			}
		}

		contextParts = append(contextParts, fmt.Sprintf("- Event: %s between %v", relType, pNames))
		contextParts = append(contextParts, fmt.Sprintf("  Evidence: %s", evidence))
		contextParts = append(contextParts, fmt.Sprintf("  Strength: %.2f | Time: %s", strength, atTime))
	}

	return strings.Join(contextParts, "\n")
}

func (s *EditorServer) Interact(
	ctx context.Context,
	req *connect.Request[editorpb.InteractRequest],
	stream *connect.ServerStream[editorpb.InteractResponse],
) error {
	log.Printf("RPC: Interact called with nodes: %v, message: %s", req.Msg.NodeIds, req.Msg.UserMessage)
	var participants []string
	combinedEmotion := make(map[string]float32)

	for _, nodeID := range req.Msg.NodeIds {
		name := nodeID
		if strings.Contains(nodeID, ":") {
			parts := strings.Split(nodeID, ":")
			name = strings.Title(parts[len(parts)-1])
		}
		
		if emotion, ok := s.NodeEmotions[nodeID]; ok {
			for k, v := range emotion {
				combinedEmotion[k] += v
			}
		}
		participants = append(participants, name)
	}

	aiClient := &ai.OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet",
	}
	
	ragContext := s.buildGraphRAGContext(ctx, "251022", req.Msg.NodeIds)

	chatPrompt := fmt.Sprintf(`You are roleplaying as the following characters/entities in the "Ghost Hacker" series: %v.
The user says: "%s"
The current emotional context is: %v.

GRAPH CONTEXT (RAG):
%s

Themes: Healing connections, 2065 Tokyo, Ghost Hacking.
Respond in-character, maintaining the first-person, present-tense, conversational style. 
Use the GRAPH CONTEXT provided to mention specific events, evidence, and relationships correctly.`, participants, req.Msg.UserMessage, combinedEmotion, ragContext)
	
	response, err := aiClient.GenerateNextScene(ctx, []string{chatPrompt})
	if err != nil {
		log.Printf("Interact AI call failed: %v", err)
		response = fmt.Sprintf("I hear you. The connection in Tokyo 2065 is complex, but we're working on it. (AI Error fallback: %v)", err)
	}

	speakerName := "System"
	if len(participants) > 0 {
		speakerName = participants[0]
	}

	sendErr := stream.Send(&editorpb.InteractResponse{
		NodeId:         req.Msg.NodeIds[0],
		NodeName:       speakerName,
		Message:        response,
		EmotionVector:  combinedEmotion,
	})
	if sendErr != nil {
		return sendErr
	}
	return nil
}

func (s *EditorServer) GetTopology(ctx context.Context, req *connect.Request[editorpb.GetTopologyRequest]) (*connect.Response[editorpb.GetTopologyResponse], error) {
	log.Printf("RPC: GetTopology called for project: %s", req.Msg.ProjectId)
	
	// Ensure we are looking into the project directory within WorkspaceRoot
	projectDir := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId)
	jsonLdPath := filepath.Join(projectDir, "ghost-hacker.jsonld")
	log.Printf("Attempting to read topology from: %s", jsonLdPath)
	
	var g struct {
		Graph []map[string]interface{} `json:"@graph"`
	}

	data, err := os.ReadFile(jsonLdPath)
	if err != nil {
		log.Printf("Warning: Could not read topology file: %v. Using empty graph.", err)
	} else {
		if err := json.Unmarshal(data, &g); err != nil {
			log.Printf("Error: Failed to unmarshal JSON-LD: %v", err)
		}
	}

	resp := &editorpb.GetTopologyResponse{}
	nodeMap := make(map[string]*editorpb.Node)
	entityHubs := make(map[string]string)
	connectedNodes := make(map[string]bool)

	// Preliminary pass to identify relations and connections
	for _, item := range g.Graph {
		itemType, _ := item["@type"].(string)
		if itemType == "gh:RelationEvent" {
			participants, _ := item["gh:participants"].([]interface{})
			for _, p := range participants {
				pID, ok := p.(string)
				if !ok {
					if pMap, ok := p.(map[string]interface{}); ok {
						pID, _ = pMap["@id"].(string)
					}
				}
				if pID != "" {
					connectedNodes[pID] = true
				}
			}
		}
	}

	for _, item := range g.Graph {
		id, _ := item["@id"].(string)
		name, _ := item["name"].(string)
		itemType, _ := item["@type"].(string)
		
		if id != "" && itemType != "gh:LayoutStub" {
			label := name
			if label == "" {
				parts := strings.Split(id, ":")
				label = parts[len(parts)-1]
				label = strings.Title(label)
			}

			group := s.categorizeNode(itemType)

	// Identification of unlinked nodes
			isLinked := connectedNodes[id]
			
			// Also check if it's already in the manuscripts or episodes
			if !isLinked {
				if itemType == "gh:Manuscript" || itemType == "gh:Episode" || itemType == "gh:Block" {
					isLinked = true
				}
			}

			if !isLinked && (group == "entity" || group == "concept") {
				group = "unlinked"
			}

			if (group == "entity" || group == "link-node" || group == "unlinked" || group == "concept" || group == "content" || group == "asset" || group == "environment" || group == "item" || group == "emotion") && entityHubs[group] == "" {
				hubID := "hub:" + group
				entityHubs[group] = hubID
				label := strings.Title(group) + " Circle"
				if group == "unlinked" {
					label = "Unlinked Circle"
				} else if group == "content" {
					label = "Story Circle"
				} else if group == "asset" {
					label = "Asset Circle"
				} else if group == "entity" {
					label = "Character Circle"
				} else if group == "environment" {
					label = "Environment Circle"
				} else if group == "item" {
					label = "Item Circle"
				} else if group == "emotion" {
					label = "Emotion Circle"
				}
				resp.Nodes = append(resp.Nodes, &editorpb.Node{
					Id:    hubID,
					Label: label,
					Type:  "gh:ClusterHub",
					Group: "meta",
				})
			}

			if hubID, ok := entityHubs[group]; ok {
				resp.Edges = append(resp.Edges, &editorpb.Edge{
					FromId:   hubID,
					ToId:     id,
					Relation: "gh:memberOf",
					Group:    "structural",
					Distance: 200,
					Strength: 0.05,
					Color:    "#444444",
				})
			}

			if itemType == "gh:RelationEvent" {
				relType, _ := item["gh:relationType"].(string)
				label = fmt.Sprintf("[%s]", relType)
				if strings.Contains(relType, ":") {
					label = fmt.Sprintf("[%s]", relType[strings.Index(relType, ":")+1:])
				}
			}

			node := &editorpb.Node{
				Id:    id,
				Label: label,
				Type:  itemType,
				Group: group,
				Embedding: s.generateDummyEmbedding(id),
			}
			if desc, ok := item["description"].(string); ok {
				node.Content = desc
			} else if evidence, ok := item["gh:evidence"].(string); ok {
				node.Content = evidence
			}

			if x, ok := item["gh:x"].(float64); ok {
				node.X = float32(x)
			}
			if y, ok := item["gh:y"].(float64); ok {
				node.Y = float32(y)
			}
			nodeMap[id] = node
			resp.Nodes = append(resp.Nodes, node)

			if itemType == "gh:RelationEvent" {
				participants, _ := item["gh:participants"].([]interface{})
				relType, _ := item["gh:relationType"].(string)
				strength, _ := item["gh:strength"].(float64)
				for _, p := range participants {
					pID, ok := p.(string)
					if !ok {
						if pMap, ok := p.(map[string]interface{}); ok {
							pID, _ = pMap["@id"].(string)
						}
					}
					if pID != "" {
						resp.Edges = append(resp.Edges, &editorpb.Edge{
							FromId:   id,
							ToId:     pID,
							Relation: relType,
							Strength: float32(strength),
							Group:    "semantic",
							Color:    "#a855f7",
							Style:    "solid",
							Distance: float32(100.0 * (1.5 - strength)),
						})
					}
				}
			}
		}
	}

	manifestPath := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/manifest.json")
	mdata, err := os.ReadFile(manifestPath)
	if err == nil {
		var m struct {
			Episodes []struct {
				ID    string   `json:"id"`
				Files []string `json:"files"`
			} `json:"episodes"`
		}
		json.Unmarshal(mdata, &m)
		for _, ep := range m.Episodes {
			epNodeID := "episode:" + ep.ID
			resp.Nodes = append(resp.Nodes, &editorpb.Node{
				Id:    epNodeID,
				Label: "Episode " + ep.ID,
				Type:  "gh:Episode",
				Group: "content",
			})

			// Link Episode to Story Circle
			resp.Edges = append(resp.Edges, &editorpb.Edge{
				FromId:   "hub:content",
				ToId:     epNodeID,
				Relation: "gh:memberOf",
				Group:    "structural",
				Distance: 200,
			})

			for _, file := range ep.Files {
				mNodeID := fmt.Sprintf("manuscript:%s:%s", ep.ID, file)
				mNode := &editorpb.Node{
					Id:    mNodeID,
					Label: file,
					Type:  "gh:Manuscript",
					Group: "content",
					Embedding: s.generateDummyEmbedding(mNodeID),
				}
				if stub, ok := nodeMap[mNodeID]; ok {
					mNode.X = stub.X
					mNode.Y = stub.Y
				}
				resp.Nodes = append(resp.Nodes, mNode)

				resp.Edges = append(resp.Edges, &editorpb.Edge{
					FromId:   epNodeID,
					ToId:     mNodeID,
					Relation: "gh:contains",
					Group:    "structural",
					Distance: 100,
					Strength: 0.5,
					Color:    "#0071e3",
				})

				// Re-enable blocks extraction (removed for lazy loading)
				/*
				filePath := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/", file)
... (truncated blocks logic) ...
				*/
			}
		}
	}

	// Add image assets if they exist (recursive scan)
	assetsRoot := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "assets")
	filepath.Walk(assetsRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		name := info.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".png" || ext == ".webp" || ext == ".jpg" || ext == ".jpeg" {
			relPath, _ := filepath.Rel(assetsRoot, path)
			assetID := "assets/" + relPath
			resp.Nodes = append(resp.Nodes, &editorpb.Node{
				Id:    assetID,
				Label: name,
				Type:  "schema:ImageObject",
				Group: "asset",
			})
			resp.Edges = append(resp.Edges, &editorpb.Edge{
				FromId:   "hub:asset",
				ToId:     assetID,
				Relation: "gh:memberOf",
				Group:    "structural",
				Distance: 150,
			})
		}
		return nil
	})

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) GetBlocks(ctx context.Context, req *connect.Request[editorpb.GetBlocksRequest]) (*connect.Response[editorpb.GetBlocksResponse], error) {
	log.Printf("RPC: GetBlocks called for manuscript: %s", req.Msg.ManuscriptId)
	
	// Manuscript ID format: manuscript:EP_ID:FILE_PATH
	parts := strings.Split(req.Msg.ManuscriptId, ":")
	if len(parts) < 3 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid manuscript id format"))
	}
	
	epID := parts[1]
	fileRelPath := strings.Join(parts[2:], ":")
	
	filePath := filepath.Join(s.WorkspaceRoot, req.Msg.ProjectId, "wattpad/", fileRelPath)
	fcontent, err := os.ReadFile(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	resp := &editorpb.GetBlocksResponse{}
	blocks := strings.Split(string(fcontent), "\n\n")
	var prevBlockID string
	for bIdx, bContent := range blocks {
		bContent = strings.TrimSpace(bContent)
		if bContent == "" {
			continue
		}
		bNodeID := fmt.Sprintf("block:%s:%s:%d", epID, fileRelPath, bIdx)
		shortLabel := bContent
		runes := []rune(bContent)
		if len(runes) > 30 {
			shortLabel = string(runes[:30]) + "..."
		}
		shortLabel = strings.ReplaceAll(shortLabel, "\n", " ")

		bNode := &editorpb.Node{
			Id:      bNodeID,
			Label:   shortLabel,
			Type:    "gh:Block",
			Content: bContent,
			Group:   "content",
			Embedding: s.generateDummyEmbedding(bNodeID),
		}
		resp.Nodes = append(resp.Nodes, bNode)

		resp.Edges = append(resp.Edges, &editorpb.Edge{
			FromId:   req.Msg.ManuscriptId,
			ToId:     bNodeID,
			Relation: "gh:contains",
			Style:    "dashed",
			Color:    "#0071e3",
			Group:    "structural",
			Distance: 60,
			Strength: 0.8,
		})

		if prevBlockID != "" {
			resp.Edges = append(resp.Edges, &editorpb.Edge{
				FromId:   prevBlockID,
				ToId:     bNodeID,
				Relation: "gh:precedes",
				Style:    "solid",
				Color:    "#34c759",
				Group:    "structural",
				Distance: 30,
				Strength: 1.0,
			})
		}
		prevBlockID = bNodeID
	}

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) generateDummyEmbedding(id string) []float32 {
	embedding := make([]float32, 16)
	sum := 0
	for _, char := range id {
		sum += int(char)
	}
	for i := range embedding {
		embedding[i] = float32((sum * (i + 1)) % 100) / 100.0
	}
	return embedding
}

func (s *EditorServer) categorizeNode(t string) string {
	switch {
	case t == "gh:RelationEvent":
		return "link-node"
	case strings.Contains(t, "Person") || strings.Contains(t, "Character") || strings.Contains(t, "Organization"):
		return "entity"
	case strings.Contains(t, "Place") || strings.Contains(t, "Setting") || strings.Contains(t, "Environment"):
		return "environment"
	case strings.Contains(t, "Item") || strings.Contains(t, "Product") || strings.Contains(t, "Object"):
		return "item"
	case strings.Contains(t, "Emotion") || strings.Contains(t, "Sentiment"):
		return "emotion"
	case strings.Contains(t, "Manuscript") || strings.Contains(t, "Block") || strings.Contains(t, "CreativeWork"):
		return "content"
	case strings.Contains(t, "Image") || strings.Contains(t, "Asset"):
		return "asset"
	default:
		return "concept"
	}
}

func (s *EditorServer) CallTool(ctx context.Context, req *connect.Request[editorpb.CallToolRequest]) (*connect.Response[editorpb.CallToolResponse], error) {
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(req.Msg.ArgumentsJson), &args); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	
	handler, ok := s.ToolHandlers[req.Msg.Name]
	if !ok {
		return connect.NewResponse(&editorpb.CallToolResponse{IsError: true, ResultJson: `{"error": "tool not found"}`}), nil
	}

	mcpReq := mcp.CallToolRequest{}
	mcpReq.Params.Name = req.Msg.Name
	mcpReq.Params.Arguments = args
	
	result, err := handler(ctx, mcpReq)
	if err != nil {
		return connect.NewResponse(&editorpb.CallToolResponse{IsError: true, ResultJson: fmt.Sprintf(`{"error": "%s"}`, err.Error())}), nil
	}
	
	resData, _ := json.Marshal(result)
	return connect.NewResponse(&editorpb.CallToolResponse{ResultJson: string(resData), IsError: result.IsError}), nil
}

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("CORS: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms, X-Grpc-Web, X-User-Agent")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func main() {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		cwd, _ := os.Getwd()
		// Default to apps/zen-editor/data relative to where we usually run from
		// If running from apps/zen-editor/backend: ../data
		// If running from apps/zen-editor: ./data
		if strings.HasSuffix(cwd, "backend") {
			workspaceRoot = filepath.Join(cwd, "..", "data")
		} else if strings.HasSuffix(cwd, "zen-editor") {
			workspaceRoot = filepath.Join(cwd, "data")
		} else {
			// Fallback to absolute path
			workspaceRoot = "/Volumes/251214/jun784/ghosthacker/apps/zen-editor/data"
		}
	}

	fmt.Printf("Using data directory: %s\n", workspaceRoot)
	srv := NewEditorServer(workspaceRoot)
	mux := http.NewServeMux()
	
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Serve project data files (including images) via /data/ prefix
	fileServer := http.FileServer(http.Dir(workspaceRoot))
	mux.Handle("/data/", http.StripPrefix("/data/", withCORS(fileServer)))

	path, handler := editorpbconnect.NewEditorServiceHandler(srv)
	mux.Handle(path, withCORS(handler))
	
	port := "8080"
	fmt.Printf("MCP + gRPC Connect Server starting on :%s\n", port)
	
	err := http.ListenAndServe(":"+port, h2c.NewHandler(mux, &http2.Server{}))
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
