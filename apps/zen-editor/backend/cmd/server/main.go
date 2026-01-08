package main

import (
	"context"
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

func (s *EditorServer) AnalyzeText(
	ctx context.Context,
	req *connect.Request[editorpb.AnalyzeTextRequest],
) (*connect.Response[editorpb.AnalyzeTextResponse], error) {
	log.Printf("AnalyzeText called: %d chars", len(req.Msg.Text))
	
	// Simulate AI analysis for now
	return connect.NewResponse(&editorpb.AnalyzeTextResponse{
		Summary: "Detected story development.",
		Entities: []*editorpb.Entity{
			{Id: "1", Type: "character", Name: "Tamaki"},
			{Id: "2", Type: "location", Name: "Tokyo"},
		},
	}), nil
}

func (s *EditorServer) GetTopology(
	ctx context.Context,
	req *connect.Request[editorpb.GetTopologyRequest],
) (*connect.Response[editorpb.GetTopologyResponse], error) {
	return connect.NewResponse(&editorpb.GetTopologyResponse{}), nil
}

func (s *EditorServer) OpenFile(
	ctx context.Context,
	req *connect.Request[editorpb.OpenFileRequest],
) (*connect.Response[editorpb.OpenFileResponse], error) {
	absPath := filepath.Join(s.WorkspaceRoot, req.Msg.Path)
	log.Printf("OpenFile called: %s", absPath)
	content, err := os.ReadFile(absPath)
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
	absPath := filepath.Join(s.WorkspaceRoot, req.Msg.Path)
	log.Printf("SaveFile called: %s", absPath)
	
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := os.WriteFile(absPath, []byte(req.Msg.Content), 0644); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	
	return connect.NewResponse(&editorpb.SaveFileResponse{
		Success: true,
	}), nil
}

func main() {
	workspaceRoot := "/Volumes/251214/jun784/ghosthacker" // Project Root
	
	mux := http.NewServeMux()
	path, handler := editorpbconnect.NewEditorServiceHandler(&EditorServer{
		WorkspaceRoot: workspaceRoot,
	})
	mux.Handle(path, handler)

	fmt.Println("Server starting on :8080 (Workspace Root: " + workspaceRoot + ")")
	err := http.ListenAndServe(
		"localhost:8080",
		h2c.NewHandler(mux, &http2.Server{}),
	)
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
