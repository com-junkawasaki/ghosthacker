//go:generate buf generate

package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"github.com/rs/cors"

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

	// Serve static images
	imagesDir := filepath.Join(workspaceRoot, "251121", "images")
	if _, err := os.Stat(imagesDir); !os.IsNotExist(err) {
		mux.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir(imagesDir))))
		log.Printf("Serving images from: %s", imagesDir)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Storyboard server starting on :%s", port)
	log.Printf("Storyboard file: %s", storyboardPath)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"},
		AllowedHeaders: []string{"*"},
		ExposedHeaders: []string{"*"},
		AllowCredentials: true,
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: h2c.NewHandler(c.Handler(mux), &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
