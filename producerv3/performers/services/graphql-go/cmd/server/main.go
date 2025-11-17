/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql-go
 * 
 * GraphQL API service for EPUB Editor Tool (Go implementation)
 * Provides Query, Mutation, and Subscription operations for EPUB editing
 */
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

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gftd/epub-editor-graphql-go/graph"
	"github.com/gftd/epub-editor-graphql-go/internal/ports"
	"github.com/gftd/epub-editor-graphql-go/internal/resolver"
)

func main() {
	ctx := context.Background()

	// Initialize Neo4j connection
	neo4jPool, err := ports.NewNeo4jPool(ctx)
	if err != nil {
		log.Fatalf("Failed to create Neo4j pool: %v", err)
	}
	defer neo4jPool.Close(ctx)

	// Create resolver
	res := resolver.NewResolver(neo4jPool)

	// Create GraphQL schema
	cfg := graph.Config{
		Resolvers: res,
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(cfg))

	// Setup routes
	http.Handle("/graphql", srv)
	http.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"))

	// Get port and host from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	host := os.Getenv("HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	addr := fmt.Sprintf("%s:%s", host, port)
	log.Printf("GraphQL server starting on %s", addr)

	// Start server in goroutine
	server := &http.Server{
		Addr:    addr,
		Handler: http.DefaultServeMux,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

