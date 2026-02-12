//go:generate buf generate

package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/dapr/go-sdk/workflow"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	daprwf "storyboard-editor/backend/internal/dapr"
	"storyboard-editor/backend/internal/service"
	"storyboard-editor/backend/proto/storyboardpbconnect"
)

func main() {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}

	projectDir := os.Getenv("PROJECT_DIR")
	if projectDir == "" {
		projectDir = "260123-jump"
	}
	log.Printf("Project: %s", projectDir)

	storyboardPath := filepath.Join(workspaceRoot, projectDir, "resources/storyboard.jsonld")
	if _, err := os.Stat(storyboardPath); os.IsNotExist(err) {
		log.Printf("Warning: storyboard.jsonld not found at %s", storyboardPath)
	}

	storyboardService := service.NewStoryboardService(storyboardPath, workspaceRoot, projectDir)

	// Initialize Dapr workflow worker (in-process, no separate worker needed)
	w, err := workflow.NewWorker()
	if err != nil {
		log.Printf("Warning: Failed to create Dapr workflow worker: %v (workflows disabled)", err)
	} else {
		if err := daprwf.RegisterWorkflows(w); err != nil {
			log.Fatalf("Failed to register workflows: %v", err)
		}
		if err := daprwf.RegisterActivities(w); err != nil {
			log.Fatalf("Failed to register activities: %v", err)
		}

		if err := w.Start(); err != nil {
			log.Printf("Warning: Failed to start Dapr workflow worker: %v (workflows disabled)", err)
		} else {
			log.Printf("Dapr workflow worker started")
			defer w.Shutdown()
		}

		// Create workflow client and inject into service
		wfClient, err := workflow.NewClient()
		if err != nil {
			log.Printf("Warning: Failed to create Dapr workflow client: %v", err)
		} else {
			storyboardService.SetWorkflowClient(wfClient)
			log.Printf("Dapr workflow client connected")
		}
	}

	mux := http.NewServeMux()

	connectPath, connectHandler := storyboardpbconnect.NewStoryboardServiceHandler(storyboardService)
	mux.Handle(connectPath, connectHandler)

	// Health check — use a top-level handler that checks path before mux
	topHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.URL.Path == "/" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"status":"ok","project":%q}`, projectDir)
			return
		}
		mux.ServeHTTP(w, r)
	})

	// Serve static images
	imagesDir := filepath.Join(workspaceRoot, projectDir, "resources/images")
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
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: h2c.NewHandler(c.Handler(topHandler), &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
