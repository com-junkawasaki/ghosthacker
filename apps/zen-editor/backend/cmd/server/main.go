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
	// 1. Open File Tool
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

	// 3. Generate Node Tool
	s.MCPServer.AddTool(mcp.NewTool("generate_node",
		mcp.WithDescription("Generates a new story node based on context from existing nodes"),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"context_paths": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{"type": "string"},
				},
				"new_path": map[string]interface{}{"type": "string"},
			},
			"required": []interface{}{"context_paths", "new_path"},
		}),
	), s.handleGenerateNodeTool)
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

	// Use OpenRouter
	client := &OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet",
	}
	
	generated, err := client.GenerateNextScene(ctx, contextTexts)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	// Save the new file
	absNewPath := newPath
	if !filepath.IsAbs(absNewPath) {
		absNewPath = filepath.Join(s.WorkspaceRoot, absNewPath)
	}
	os.MkdirAll(filepath.Dir(absNewPath), 0755)
	os.WriteFile(absNewPath, []byte(generated), 0644)

	return mcp.NewToolResultText(fmt.Sprintf("Generated new node at %s\n\nContent Preview:\n%s", newPath, generated[:200])), nil
}

// Tool Handlers
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

// Traditional ConnectRPC Handlers
func (s *EditorServer) GetProjectMetadata(ctx context.Context, req *connect.Request[editorpb.GetProjectMetadataRequest]) (*connect.Response[editorpb.GetProjectMetadataResponse], error) {
	// ... (Existing logic for manifest)
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
	// ... (Existing logic for JSON-LD)
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
		if id != "" && name != "" {
			resp.Nodes = append(resp.Nodes, &editorpb.Node{Id: id, Label: name, Type: itemType})
		}
	}
	return connect.NewResponse(resp), nil
}

// Unified CallTool Handler
func (s *EditorServer) CallTool(ctx context.Context, req *connect.Request[editorpb.CallToolRequest]) (*connect.Response[editorpb.CallToolResponse], error) {
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(req.Msg.ArgumentsJson), &args); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	mcpReq := mcp.CallToolRequest{
		Params: struct {
			Name      string                 `json:"name"`
			Arguments map[string]interface{} `json:"arguments,omitempty"`
		}{
			Name:      req.Msg.Name,
			Arguments: args,
		},
	}

	// Internal MCP tool execution
	result, err := s.MCPServer.CallTool(ctx, mcpReq)
	if err != nil {
		return connect.NewResponse(&editorpb.CallToolResponse{
			IsError:    true,
			ResultJson: fmt.Sprintf(`{"error": "%s"}`, err.Error()),
		}), nil
	}

	resData, _ := json.Marshal(result)
	return connect.NewResponse(&editorpb.CallToolResponse{
		ResultJson: string(resData),
		IsError:    result.IsError,
	}), nil
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
