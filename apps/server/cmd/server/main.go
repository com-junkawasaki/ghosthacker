//go:generate buf generate

package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dapr/go-sdk/workflow"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	daprwf "storyboard-editor/backend/internal/dapr"
	"storyboard-editor/backend/internal/service"
	"storyboard-editor/backend/proto/storyboardpbconnect"
)

func daprGRPCAddress() string {
	port := os.Getenv("DAPR_GRPC_PORT")
	if port == "" {
		port = "50001"
	}
	return "127.0.0.1:" + port
}

func shouldEnableDapr() bool {
	if os.Getenv("ENABLE_DAPR") == "1" {
		return true
	}

	conn, err := net.DialTimeout("tcp", daprGRPCAddress(), 500*time.Millisecond)
	if err != nil {
		log.Printf("Dapr sidecar not reachable at %s; workflows disabled", daprGRPCAddress())
		return false
	}
	_ = conn.Close()
	return true
}

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

	if shouldEnableDapr() {
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
	}

	mux := http.NewServeMux()

	connectPath, connectHandler := storyboardpbconnect.NewStoryboardServiceHandler(storyboardService)
	mux.Handle(connectPath, connectHandler)

	imageGenURL := os.Getenv("IMAGE_GEN_URL")
	if imageGenURL == "" {
		imageGenURL = "http://localhost:8100"
	}

	// Health check — use a top-level handler that checks path before mux
	topHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || r.URL.Path == "/" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{"status":"ok","project":%q}`, projectDir)
			return
		}
		// Proxy image-gen health check
		if r.URL.Path == "/api/image-gen-health" {
			proxyImageGenEndpoint(w, imageGenURL+"/health")
			return
		}
		// Proxy image-gen progress
		if r.URL.Path == "/api/image-gen-progress" {
			proxyImageGenEndpoint(w, imageGenURL+"/progress")
			return
		}
		if strings.HasPrefix(r.URL.Path, "/images/") {
			imagesDir := storyboardService.CurrentImagesDir()
			if _, err := os.Stat(imagesDir); err != nil {
				http.NotFound(w, r)
				return
			}
			http.StripPrefix("/images/", http.FileServer(http.Dir(imagesDir))).ServeHTTP(w, r)
			return
		}
		mux.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Storyboard server starting on :%s", port)
	log.Printf("Storyboard file: %s", storyboardPath)
	log.Printf("Active project images: %s", storyboardService.CurrentImagesDir())

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

// proxyImageGenEndpoint proxies a GET request to the image-gen service.
func proxyImageGenEndpoint(w http.ResponseWriter, url string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, `{"status":"unavailable"}`)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
