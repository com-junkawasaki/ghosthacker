package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto"
	"github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct {
	WorkspaceRoot string
}

type Manifest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Episodes    []struct {
		ID    string   `json:"id"`
		Title string   `json:"title"`
		Files []string `json:"files"`
	} `json:"episodes"`
}

type JsonLdGraph struct {
	Graph []map[string]interface{} `json:"@graph"`
}

func (s *EditorServer) AnalyzeText(
	ctx context.Context,
	req *connect.Request[editorpb.AnalyzeTextRequest],
) (*connect.Response[editorpb.AnalyzeTextResponse], error) {
	log.Printf("AnalyzeText called: %d chars", len(req.Msg.Text))
	return connect.NewResponse(&editorpb.AnalyzeTextResponse{
		Summary: "Detected story development.",
		Entities: []*editorpb.Entity{
			{Id: "1", Type: "character", Name: "Tamaki"},
			{Id: "2", Type: "location", Name: "Tokyo"},
		},
	}), nil
}

func (s *EditorServer) GetProjectMetadata(
	ctx context.Context,
	req *connect.Request[editorpb.GetProjectMetadataRequest],
) (*connect.Response[editorpb.GetProjectMetadataResponse], error) {
	manifestPath := filepath.Join(s.WorkspaceRoot, "251022/wattpad/manifest.json")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &editorpb.GetProjectMetadataResponse{
		Title:       m.Title,
		Description: m.Description,
	}
	for _, ep := range m.Episodes {
		resp.Episodes = append(resp.Episodes, &editorpb.Episode{
			Id:    ep.ID,
			Title: ep.Title,
			Files: ep.Files,
		})
	}

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) GetTopology(
	ctx context.Context,
	req *connect.Request[editorpb.GetTopologyRequest],
) (*connect.Response[editorpb.GetTopologyResponse], error) {
	jsonLdPath := filepath.Join(s.WorkspaceRoot, "251022/ghost-hacker.jsonld")
	data, err := os.ReadFile(jsonLdPath)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	var g JsonLdGraph
	if err := json.Unmarshal(data, &g); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	resp := &editorpb.GetTopologyResponse{}
	for _, item := range g.Graph {
		id, _ := item["@id"].(string)
		name, _ := item["name"].(string)
		itemType, _ := item["@type"].(string)

		if id != "" && name != "" {
			resp.Nodes = append(resp.Nodes, &editorpb.Node{
				Id:    id,
				Label: name,
				Type:  itemType,
			})
		}

		// Simplified relationship extraction (gh:hasCharacter, knows, etc.)
		// This is a basic mapping for visualization
		if chars, ok := item["gh:hasCharacter"].([]interface{}); ok {
			for _, c := range chars {
				if cMap, ok := c.(map[string]interface{}); ok {
					targetID, _ := cMap["@id"].(string)
					if targetID != "" {
						resp.Edges = append(resp.Edges, &editorpb.Edge{
							FromId:   id,
							ToId:     targetID,
							Relation: "hasCharacter",
						})
					}
				}
			}
		}
	}

	return connect.NewResponse(resp), nil
}

func (s *EditorServer) OpenFile(
	ctx context.Context,
	req *connect.Request[editorpb.OpenFileRequest],
) (*connect.Response[editorpb.OpenFileResponse], error) {
	// Normalize path (handle both relative and absolute-ish)
	path := req.Msg.Path
	if !filepath.IsAbs(path) {
		path = filepath.Join(s.WorkspaceRoot, path)
	}
	
	log.Printf("OpenFile called: %s", path)
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&editorpb.OpenFileResponse{
		Content: string(content),
	}), nil
}

func (s *EditorServer) SaveFile(
	ctx context.Context,
	req *connect.Request[editorpb.SaveFileRequest],
) (*connect.Response[editorpb.SaveFileResponse], error) {
	path := req.Msg.Path
	if !filepath.IsAbs(path) {
		path = filepath.Join(s.WorkspaceRoot, path)
	}

	log.Printf("SaveFile called: %s", path)
	
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := os.WriteFile(path, []byte(req.Msg.Content), 0644); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	
	return connect.NewResponse(&editorpb.SaveFileResponse{
		Success: true,
	}), nil
}

func main() {
	workspaceRoot := "/Volumes/251214/jun784/ghosthacker"
	
	mux := http.NewServeMux()
	path, handler := editorpbconnect.NewEditorServiceHandler(&EditorServer{
		WorkspaceRoot: workspaceRoot,
	})

	// Add a simple CORS wrapper for web access
	corsHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Connect-Protocol-Version, Content-Type, Connect-Timeout-Ms")
		if r.Method == "OPTIONS" {
			return
		}
		handler.ServeHTTP(w, r)
	})

	mux.Handle(path, corsHandler)

	fmt.Println("Server starting on :8080 (Workspace Root: " + workspaceRoot + ")")
	err := http.ListenAndServe(
		"localhost:8080",
		h2c.NewHandler(mux, &http2.Server{}),
	)
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
