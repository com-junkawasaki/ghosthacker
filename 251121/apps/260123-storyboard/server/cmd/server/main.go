//go:generate buf generate

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"storyboard-editor/backend/internal/service"
	"storyboard-editor/backend/proto/storyboardpbconnect"
)

func main() {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}

	storyboardPath := filepath.Join(workspaceRoot, "251121/storyboard.jsonld")
	if _, err := os.Stat(storyboardPath); os.IsNotExist(err) {
		log.Printf("Warning: storyboard.jsonld not found at %s", storyboardPath)
	}

	storyboardService := service.NewStoryboardService(storyboardPath)

	mux := http.NewServeMux()
	path, handler := storyboardpbconnect.NewStoryboardServiceHandler(storyboardService)
	mux.Handle(path, handler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Storyboard server starting on :%s", port)
	log.Printf("Storyboard file: %s", storyboardPath)

	server := &http.Server{
		Addr:    ":" + port,
		Handler: h2c.NewHandler(mux, &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
