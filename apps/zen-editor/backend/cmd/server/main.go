package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/internal/ai"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct {
	WorkspaceRoot string
	MCPServer     *server.MCPServer
	NodeEmotions  map[string]map[string]float32
	ToolHandlers  map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)
}

func NewEditorServer(root string) *EditorServer {
	s := &EditorServer{
		WorkspaceRoot: root,
		MCPServer:     server.NewMCPServer("GhostHackerEditor", "1.0.0"),
		NodeEmotions:  initNodeEmotions(),
		ToolHandlers:  make(map[string]func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error)),
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
	jsonLdPath := filepath.Join(s.WorkspaceRoot, "251022/ghost-hacker.jsonld")

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
	manifestPath := filepath.Join(s.WorkspaceRoot, "251022/wattpad/manifest.json")
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

func (s *EditorServer) buildGraphRAGContext(ctx context.Context, nodeIDs []string) string {
	jsonLdPath := filepath.Join(s.WorkspaceRoot, "251022/ghost-hacker.jsonld")
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

	// 1. Find all related events and entities
	for _, item := range g.Graph {
		id, _ := item["@id"].(string)
		itemType, _ := item["@type"].(string)

		// Check if it's one of our target nodes
		for _, targetID := range nodeIDs {
			if id == targetID {
				relatedEntities[id] = item
			}
		}

		// Check if it's a RelationEvent participating with our nodes
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
				// Also add other participants to entities list for context
				for _, p := range participants {
					pID, _ := p.(string)
					if _, exists := relatedEntities[pID]; !exists {
						// We'll find them in the next pass or ignore if not in @graph
					}
				}
			}
		}
	}

	// 2. Format Entities
	contextParts = append(contextParts, "--- RELEVANT ENTITIES ---")
	for id, ent := range relatedEntities {
		name, _ := ent["name"].(string)
		desc, _ := ent["description"].(string)
		contextParts = append(contextParts, fmt.Sprintf("ID: %s | Name: %s | Description: %s", id, name, desc))
	}

	// 3. Format Events (Incidence/Hypergraph relationships)
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
		// Try to find a better name if possible
		// In a real app, we'd have a node cache or lookup
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
		Model:  "anthropic/claude-3.5-sonnet", // Or any reliable model
	}
	
	// GraphRAG: Build rich context from JSON-LD
	ragContext := s.buildGraphRAGContext(ctx, req.Msg.NodeIds)

	// Better prompt for chat interaction using GraphRAG context
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
		// Canned response for demo/test purposes if AI fails
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
	jsonLdPath := filepath.Join(s.WorkspaceRoot, "251022/ghost-hacker.jsonld")
	data, err := os.ReadFile(jsonLdPath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	var g struct {
		Graph []map[string]interface{} `json:"@graph"`
	}
	json.Unmarshal(data, &g)
	resp := &editorpb.GetTopologyResponse{}

	// ID to Node map for easy lookup
	nodeMap := make(map[string]*editorpb.Node)

	// 1. Load entities from JSON-LD
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

			// Special handling for RelationEvent (Incidence Graph / Hypergraph)
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
				Group: s.categorizeNode(itemType),
				Embedding: s.generateDummyEmbedding(id), // Generate vector
			}
			if x, ok := item["gh:x"].(float64); ok {
				node.X = float32(x)
			}
			if y, ok := item["gh:y"].(float64); ok {
				node.Y = float32(y)
			}
			nodeMap[id] = node
			resp.Nodes = append(resp.Nodes, node)

			// If it's a RelationEvent, create edges to all participants
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
							FromId:   id, // From the Event Node
							ToId:     pID, // To the Participant
							Relation: relType,
							Strength: float32(strength),
							Group:    "semantic",
							Color:    "#a855f7",
							Style:    "solid",
							Distance: float32(100.0 * (1.5 - strength)), // Distance based on strength
						})
					}
				}
			}
		}
	}

	// 2. Load Manuscript and Blocks dynamically
	manifestPath := filepath.Join(s.WorkspaceRoot, "251022/wattpad/manifest.json")
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
			for _, file := range ep.Files {
				mNodeID := fmt.Sprintf("manuscript:%s:%s", ep.ID, file)
				mNode := &editorpb.Node{
					Id:    mNodeID,
					Label: file,
					Type:  "gh:Manuscript",
					Group: "content",
					Embedding: s.generateDummyEmbedding(mNodeID),
				}
				// Try to restore position from LayoutStub if exists
				if stub, ok := nodeMap[mNodeID]; ok {
					mNode.X = stub.X
					mNode.Y = stub.Y
				}
				resp.Nodes = append(resp.Nodes, mNode)

				// Extract blocks
				filePath := filepath.Join(s.WorkspaceRoot, "251022/wattpad/", file)
				fcontent, ferr := os.ReadFile(filePath)
				if ferr == nil {
					blocks := strings.Split(string(fcontent), "\n\n")
					var prevBlockID string
					for bIdx, bContent := range blocks {
						bContent = strings.TrimSpace(bContent)
						if bContent == "" {
							continue
						}
						bNodeID := fmt.Sprintf("block:%s:%s:%d", ep.ID, file, bIdx)
						shortLabel := bContent
						runes := []rune(bContent)
						if len(runes) > 25 {
							shortLabel = string(runes[:25]) + "..."
						}
						bNode := &editorpb.Node{
							Id:      bNodeID,
							Label:   shortLabel,
							Type:    "gh:Block",
							Content: bContent,
							Group:   "content",
							Embedding: s.generateDummyEmbedding(bNodeID),
						}
						resp.Nodes = append(resp.Nodes, bNode)

						// Link: Manuscript contains Block
						resp.Edges = append(resp.Edges, &editorpb.Edge{
							FromId:   mNodeID,
							ToId:     bNodeID,
							Relation: "gh:contains",
							Style:    "dashed",
							Color:    "#d2d2d7",
							Group:    "structural",
							Distance: 50, // Close distance for containment
						})

						// Link: Sequential blocks
						if prevBlockID != "" {
							resp.Edges = append(resp.Edges, &editorpb.Edge{
								FromId:   prevBlockID,
								ToId:     bNodeID,
								Relation: "gh:precedes",
								Style:    "solid",
								Color:    "#0071e3",
								Group:    "structural",
								Distance: 30, // Sequential blocks are close
							})
						}
						prevBlockID = bNodeID

						// Link: Detect translation
						if strings.HasSuffix(file, ".en.md") {
							jaFile := strings.Replace(file, ".en.md", ".md", 1)
							jaNodeID := fmt.Sprintf("manuscript:%s:%s", ep.ID, jaFile)
							resp.Edges = append(resp.Edges, &editorpb.Edge{
								FromId:   mNodeID,
								ToId:     jaNodeID,
								Relation: "gh:translationOf",
								Style:    "dotted",
								Color:    "#34c759",
								Group:    "semantic",
								Distance: 150,
							})
						}

						// Link: Character/Setting mentioned in Block
						for _, ent := range resp.Nodes {
							if ent.Group == "entity" {
								if strings.Contains(bContent, ent.Label) {
									resp.Edges = append(resp.Edges, &editorpb.Edge{
										FromId:   ent.Id,
										ToId:     bNodeID,
										Relation: "gh:appearsIn",
										Style:    "dotted",
										Color:    "#ff9500",
										Group:    "semantic",
										Distance: 80,
									})
								}
							}
						}
					}
				}
			}
		}
	}

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) generateDummyEmbedding(id string) []float32 {
	// Simple hash-based dummy embedding for stable positions
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
	case strings.Contains(t, "Person") || strings.Contains(t, "Place") || strings.Contains(t, "Organization"):
		return "entity"
	case strings.Contains(t, "Manuscript") || strings.Contains(t, "Block") || strings.Contains(t, "CreativeWork"):
		return "content"
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
	workspaceRoot := "/Volumes/251214/jun784/ghosthacker"
	srv := NewEditorServer(workspaceRoot)
	mux := http.NewServeMux()
	
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	path, handler := editorpbconnect.NewEditorServiceHandler(srv)
	mux.Handle(path, withCORS(handler))
	
	port := "8080"
	fmt.Printf("MCP + gRPC Connect Server starting on :%s\n", port)
	
	err := http.ListenAndServe(":"+port, h2c.NewHandler(mux, &http2.Server{}))
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
