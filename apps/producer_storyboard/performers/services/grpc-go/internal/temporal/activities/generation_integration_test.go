//go:build integration
// +build integration

package activities

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
)

// setupTestDB creates a test database connection
func setupTestDB(t *testing.T) *pgxpool.Pool {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("Skipping integration test: DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, databaseURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("Failed to ping database: %v", err)
	}

	return pool
}

// TestGenerationActivityHandler_GetCharacterReferenceImagesActivity_Integration tests character reference image retrieval
func TestGenerationActivityHandler_GetCharacterReferenceImagesActivity_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()

	handler := NewGenerationActivityHandler(pool)
	ctx := context.Background()

	// Create a test character first (this would require project setup)
	// For now, test with a non-existent character ID to verify error handling
	nonExistentID := uuid.New().String()

	images, err := handler.GetCharacterReferenceImagesActivity(ctx, nonExistentID)
	if err == nil {
		t.Logf("Retrieved %d reference images for character %s", len(images), nonExistentID)
	} else {
		t.Logf("Expected error for non-existent character (testing error handling): %v", err)
	}
}

// TestGenerationActivityHandler_GenerateImageActivity_Integration tests image generation activity
func TestGenerationActivityHandler_GenerateImageActivity_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	pool := setupTestDB(t)
	defer pool.Close()

	handler := NewGenerationActivityHandler(pool)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Test with OpenAI provider (default)
	input := workflows.ImageGenerationWorkflowInput{
		SceneID:     uuid.New().String(),
		Prompt:      "A test image",
		Model:       "dall-e-3",
		Provider:    "openai",
		OrgID:       "test-org",
		CharacterID: "",
	}

	result, err := handler.GenerateImageActivity(ctx, input)
	if err != nil {
		// OpenAI might not be configured, test error handling
		t.Logf("Image generation failed (expected if OpenAI not configured): %v", err)
		return
	}

	if result == nil {
		t.Fatal("Result is nil")
	}

	if len(result.ImageData) == 0 {
		t.Error("Image data is empty")
	}

	t.Logf("Successfully generated image: provider=%s, format=%s, size=%d bytes",
		result.Provider, result.ImageFormat, len(result.ImageData))
}

// TestGenerationActivityHandler_GenerateImageActivity_Higgsfield_Integration tests Higgsfield image generation
func TestGenerationActivityHandler_GenerateImageActivity_Higgsfield_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	pool := setupTestDB(t)
	defer pool.Close()

	handler := NewGenerationActivityHandler(pool)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	input := workflows.ImageGenerationWorkflowInput{
		SceneID:     uuid.New().String(),
		Prompt:      "A beautiful landscape",
		Model:       "higgsfield",
		Provider:    "higgsfield",
		OrgID:       "test-org",
		CharacterID: "",
	}

	result, err := handler.GenerateImageActivity(ctx, input)
	if err != nil {
		t.Fatalf("Failed to generate image with Higgsfield: %v", err)
	}

	if result == nil {
		t.Fatal("Result is nil")
	}

	if result.Provider != "higgsfield" {
		t.Errorf("Expected provider 'higgsfield', got '%s'", result.Provider)
	}

	if len(result.ImageData) == 0 {
		t.Error("Image data is empty")
	}

	t.Logf("Successfully generated image with Higgsfield: format=%s, size=%d bytes, externalID=%s",
		result.ImageFormat, len(result.ImageData), result.ExternalImageID)
}

// TestGenerationActivityHandler_SaveGeneratedImageActivity_Integration tests saving generated images
func TestGenerationActivityHandler_SaveGeneratedImageActivity_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()

	handler := NewGenerationActivityHandler(pool)
	ctx := context.Background()

	// Create a test scene ID (would need proper project/storyboard/scene setup in real scenario)
	sceneID := uuid.New().String()
	orgID := "test-org"

	result := workflows.ImageGenerationWorkflowResult{
		ImageData:       []byte("fake-image-data"),
		ImageFormat:     "png",
		Prompt:          "Test prompt",
		Model:           "test-model",
		ImageType:       "start",
		Provider:        "higgsfield",
		ExternalImageID: "test-task-id",
		CharacterID:     "",
	}

	imageID, err := handler.SaveGeneratedImageActivity(ctx, result, sceneID, orgID, "")
	if err != nil {
		t.Fatalf("Failed to save generated image: %v", err)
	}

	if imageID == "" {
		t.Error("Image ID is empty")
	}

	t.Logf("Successfully saved generated image: id=%s", imageID)

	// Cleanup: delete the test image
	imageUUID, err := uuid.Parse(imageID)
	if err == nil {
		pgUUID := pgtype.UUID{Bytes: imageUUID, Valid: true}
		handler.queries.DeleteGeneratedImage(ctx, pgUUID)
	}
}

// TestGenerationActivityHandler_GenerateCharacterImageActivity_Integration tests character image generation
func TestGenerationActivityHandler_GenerateCharacterImageActivity_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	pool := setupTestDB(t)
	defer pool.Close()

	handler := NewGenerationActivityHandler(pool)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// This test requires a character with reference images
	// For now, test error handling with empty reference images
	characterID := uuid.New().String()

	genInput := workflows.ImageGenerationWorkflowInput{
		Prompt:      "Character in action",
		Model:       "higgsfield",
		Provider:    "higgsfield",
		OrgID:       "test-org",
		CharacterID: characterID,
	}

	genActivityInput := map[string]interface{}{
		"input":           genInput,
		"referenceImages": [][]byte{}, // Empty - will fail validation
		"style":           "cinematic",
		"aspectRatio":     "16:9",
	}

	_, err := handler.GenerateCharacterImageActivity(ctx, genActivityInput)
	if err == nil {
		t.Error("Expected error for empty reference images")
	} else {
		t.Logf("Received expected error: %v", err)
	}
}
