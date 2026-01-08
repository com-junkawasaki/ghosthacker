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

	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct {
	WorkspaceRoot string
	MCPServer     *server.MCPServer
}

func NewEditorServer(root string) *EditorServer {
	s := &EditorServer{
		WorkspaceRoot: root,
		MCPServer:     server.NewMCPServer("GhostHackerEditor", "1.0.0"),
	}
	s.registerMCPTools()
	return s
}

// MCP Tool Registration
func (s *EditorServer) registerMCPTools() {
	s.MCPServer.AddTool(mcp.NewTool("open_file",
		mcp.WithDescription("Opens a local markdown file"),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"path": map[string]interface{}{"type": "string"},
			},
			"required": []interface{}{"path"},
		}),
	), s.handleOpenFileTool)

	s.MCPServer.AddTool(mcp.NewTool("save_file",
		mcp.WithDescription("Saves content to a local markdown file"),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"path":    map[string]interface{}{"type": "string"},
				"content": map[string]interface{}{"type": "string"},
			},
			"required": []interface{}{"path", "content"},
		}),
	), s.handleSaveFileTool)

	s.MCPServer.AddTool(mcp.NewTool("generate_node",
		mcp.WithDescription("Generates a new story node based on context from existing nodes"),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"context_paths": map[string]interface{}{
					"type":  "array",
					"items": map[string]interface{}{"type": "string"},
				},
				"new_path": map[string]interface{}{"type": "string"},
			},
			"required": []interface{}{"context_paths", "new_path"},
		}),
	), s.handleGenerateNodeTool)

	s.MCPServer.AddTool(mcp.NewTool("update_node_positions",
		mcp.WithDescription("Persists node positions to ghost-hacker.jsonld"),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"positions": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"id": map[string]interface{}{"type": "string"},
							"x":  map[string]interface{}{"type": "number"},
							"y":  map[string]interface{}{"type": "number"},
						},
						"required": []interface{}{"id", "x", "y"},
					},
				},
			},
			"required": []interface{}{"positions"},
		}),
	), s.handleUpdateNodePositionsTool)
}

func (s *EditorServer) handleUpdateNodePositionsTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	positions, _ := req.Arguments["positions"].([]interface{})
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

	return mcp.NewToolResultText(fmt.Sprintf("Successfully updated %d node positions in ghost-hacker.jsonld", updatedCount)), nil
}

func (s *EditorServer) handleGenerateNodeTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	paths, _ := req.Arguments["context_paths"].([]interface{})
	newPath, _ := req.Arguments["new_path"].(string)
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
	client := &OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet",
	}
	generated, err := client.GenerateNextScene(ctx, contextTexts)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	absNewPath := newPath
	if !filepath.IsAbs(absNewPath) {
		absNewPath = filepath.Join(s.WorkspaceRoot, absNewPath)
	}
	os.MkdirAll(filepath.Dir(absNewPath), 0755)
	os.WriteFile(absNewPath, []byte(generated), 0644)
	return mcp.NewToolResultText(fmt.Sprintf("Generated new node at %s", newPath)), nil
}

func (s *EditorServer) handleOpenFileTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	path, _ := req.Arguments["path"].(string)
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
	path, _ := req.Arguments["path"].(string)
	content, _ := req.Arguments["content"].(string)
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

func (s *EditorServer) GetTopology(ctx context.Context, req *connect.Request[editorpb.GetTopologyRequest]) (*connect.Response[editorpb.GetTopologyResponse], error) {
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
	for _, item := range g.Graph {
		id, _ := item["@id"].(string)
		name, _ := item["name"].(string)
		itemType, _ := item["@type"].(string)
		if id != "" {
			node := &editorpb.Node{Id: id, Label: name, Type: itemType}
			if x, ok := item["gh:x"].(float64); ok {
				node.X = float32(x)
			}
			if y, ok := item["gh:y"].(float64); ok {
				node.Y = float32(y)
			}
			resp.Nodes = append(resp.Nodes, node)
		}
		if chars, ok := item["gh:hasCharacter"].([]interface{}); ok {
			for _, c := range chars {
				if cMap, ok := c.(map[string]interface{}); ok {
					targetID, _ := cMap["@id"].(string)
					if targetID != "" {
						resp.Edges = append(resp.Edges, &editorpb.Edge{FromId: id, ToId: targetID, Relation: "hasCharacter"})
					}
				}
			}
		}
	}
	return connect.NewResponse(resp), nil
}

func (s *EditorServer) CallTool(ctx context.Context, req *connect.Request[editorpb.CallToolRequest]) (*connect.Response[editorpb.CallToolResponse], error) {
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(req.Msg.ArgumentsJson), &args); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}
	mcpReq := mcp.CallToolRequest{}
	mcpReq.Params.Name = req.Msg.Name
	mcpReq.Params.Arguments = args
	result, err := s.MCPServer.CallTool(ctx, mcpReq)
	if err != nil {
		return connect.NewResponse(&editorpb.CallToolResponse{IsError: true, ResultJson: fmt.Sprintf(`{"error": "%s"}`, err.Error())}), nil
	}
	resData, _ := json.Marshal(result)
	return connect.NewResponse(&editorpb.CallToolResponse{ResultJson: string(resData), IsError: result.IsError}), nil
}

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	path, handler := editorpbconnect.NewEditorServiceHandler(srv)
	mux.Handle(path, withCORS(handler))
	fmt.Println("MCP + gRPC Connect Server starting on :8080")
	err := http.ListenAndServe("localhost:8080", h2c.NewHandler(mux, &http2.Server{}))
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
