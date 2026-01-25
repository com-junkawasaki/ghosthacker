package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/auth"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/manga/v1/mangav1connect"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/novel/v1/novelv1connect"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/gen/storyboard/v1/storyboardv1connect"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/service"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal"
)

func main() {
	ctx := context.Background()

	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	}

	// Connect to database
	pool, err := db.NewPool(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Connect to Temporal
	temporalClient, err := temporal.NewClient()
	if err != nil {
		log.Fatalf("Failed to connect to Temporal: %v", err)
	}
	defer temporalClient.Close()

	// Create services with Temporal client
	storyboardService, err := service.NewStoryboardService(pool, temporalClient)
	if err != nil {
		log.Fatalf("Failed to create storyboard service: %v", err)
	}

	novelService, err := service.NewNovelService(pool, temporalClient)
	if err != nil {
		log.Fatalf("Failed to create novel service: %v", err)
	}

	mangaService, err := service.NewMangaService(pool, temporalClient)
	if err != nil {
		log.Fatalf("Failed to create manga service: %v", err)
	}

	// Create Connect interceptor chain
	interceptors := connect.WithInterceptors(
		auth.NewAuthInterceptor(),
	)

	// Create Connect handlers
	storyboardPath, storyboardHandler := storyboardv1connect.NewStoryboardServiceHandler(
		storyboardService,
		interceptors,
	)

	novelPath, novelHandler := novelv1connect.NewNovelServiceHandler(
		novelService,
		interceptors,
	)

	mangaPath, mangaHandler := mangav1connect.NewMangaServiceHandler(
		mangaService,
		interceptors,
	)

	// Setup HTTP server
	mux := http.NewServeMux()
	mux.Handle(storyboardPath, corsMiddleware(storyboardHandler))
	mux.Handle(novelPath, corsMiddleware(novelHandler))
	mux.Handle(mangaPath, corsMiddleware(mangaHandler))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	host := os.Getenv("HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	addr := fmt.Sprintf("%s:%s", host, port)

	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("gRPC-Connect server running on http://%s", addr)
		log.Printf("Storyboard Connect endpoint: http://%s%s", addr, storyboardPath)
		log.Printf("Novel Connect endpoint: http://%s%s", addr, novelPath)
		log.Printf("Manga Connect endpoint: http://%s%s", addr, mangaPath)
		log.Printf("Health check: http://%s/health", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Org-Id, X-User-Id, X-Clerk-Session")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
