package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	// These would be generated from the proto
	// "github.com/gftd-ai/ghost-hacker/apps/zen-editor/backend/proto/editorpbconnect"
)

type EditorServer struct{}

func (s *EditorServer) AnalyzeText(
	ctx context.Context,
	req *connect.Request[interface{}], // Placeholder until code gen
) (*connect.Response[interface{}], error) {
	log.Println("AnalyzeText called")
	return nil, nil
}

func main() {
	mux := http.NewServeMux()
	// path, handler := editorpbconnect.NewEditorServiceHandler(&EditorServer{})
	// mux.Handle(path, handler)

	fmt.Println("Server starting on :8080")
	err := http.ListenAndServe(
		"localhost:8080",
		h2c.NewHandler(mux, &http2.Server{}),
	)
	if err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

