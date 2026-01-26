//go:build integration
// +build integration

package services

import (
	"context"
	"os"
	"testing"
	"time"
)

// TestHiggsfieldService_GenerateImage_Integration tests image generation with real API
func TestHiggsfieldService_GenerateImage_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Test basic image generation
	result, err := service.GenerateImage(ctx, "A beautiful sunset over mountains", "", "", nil)
	if err != nil {
		t.Fatalf("Failed to generate image: %v", err)
	}

	if result == nil {
		t.Fatal("Result is nil")
	}

	if len(result.ImageData) == 0 {
		t.Error("Image data is empty")
	}

	if result.ImageFormat == "" {
		t.Error("Image format is empty")
	}

	if result.TaskID == "" {
		t.Error("Task ID is empty")
	}

	t.Logf("Successfully generated image: format=%s, size=%d bytes, taskID=%s",
		result.ImageFormat, len(result.ImageData), result.TaskID)
}

// TestHiggsfieldService_GenerateCharacterImage_Integration tests character image generation with Soul ID
func TestHiggsfieldService_GenerateCharacterImage_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// Create sample reference images (in real scenario, these would be actual character images)
	referenceImages := [][]byte{
		[]byte("fake-reference-image-1"),
		[]byte("fake-reference-image-2"),
	}

	// This will fail validation, but tests the error handling
	_, err = service.GenerateCharacterImage(ctx, "Character in action pose", referenceImages, "cinematic", "16:9")
	if err == nil {
		t.Error("Expected error for invalid reference images")
	}

	// Note: Real integration test would require actual character reference images
	t.Log("Character image generation test completed (validation test)")
}

// TestHiggsfieldService_ErrorHandling_Integration tests error handling with invalid requests
func TestHiggsfieldService_ErrorHandling_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test with invalid API key (if we can create a service with invalid key)
	// This tests the error handling path
	_, err = service.GenerateImage(ctx, "", "", "", nil)
	if err != nil {
		var apiErr *HiggsfieldError
		if apiErr, ok := err.(*HiggsfieldError); ok {
			t.Logf("Received expected API error: %v", apiErr)
			if apiErr.StatusCode == 0 {
				t.Error("API error should have status code")
			}
		} else {
			t.Logf("Received non-API error (expected for empty prompt): %v", err)
		}
	}
}

// TestHiggsfieldService_PollTaskStatus_Integration tests task status polling
func TestHiggsfieldService_PollTaskStatus_Integration(t *testing.T) {
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping integration test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Start an image generation task
	result, err := service.GenerateImage(ctx, "Test image for polling", "", "", nil)
	if err != nil {
		t.Fatalf("Failed to start image generation: %v", err)
	}

	if result.TaskID == "" {
		t.Fatal("Task ID is empty")
	}

	t.Logf("Started task: %s, polling will happen automatically in GenerateImage", result.TaskID)
}
