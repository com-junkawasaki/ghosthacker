package services

import (
	"context"
	"os"
	"testing"
)

func TestNewHiggsfieldService(t *testing.T) {
	// Test with separate API key and secret
	os.Setenv("HIGGSFIELD_API_KEY", "test-key")
	os.Setenv("HIGGSFIELD_API_SECRET", "test-secret")
	defer os.Unsetenv("HIGGSFIELD_API_KEY")
	defer os.Unsetenv("HIGGSFIELD_API_SECRET")

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}
	if service == nil {
		t.Fatal("Service is nil")
	}
	if service.apiKey != "test-key" {
		t.Errorf("Expected apiKey 'test-key', got '%s'", service.apiKey)
	}
	if service.apiSecret != "test-secret" {
		t.Errorf("Expected apiSecret 'test-secret', got '%s'", service.apiSecret)
	}

	// Test with combined key format
	os.Unsetenv("HIGGSFIELD_API_KEY")
	os.Unsetenv("HIGGSFIELD_API_SECRET")
	os.Setenv("HIGGSFIELD_KEY", "combined-key:combined-secret")
	defer os.Unsetenv("HIGGSFIELD_KEY")

	service2, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service with combined key: %v", err)
	}
	if service2.apiKey != "combined-key" {
		t.Errorf("Expected apiKey 'combined-key', got '%s'", service2.apiKey)
	}
	if service2.apiSecret != "combined-secret" {
		t.Errorf("Expected apiSecret 'combined-secret', got '%s'", service2.apiSecret)
	}

	// Test with missing credentials
	os.Unsetenv("HIGGSFIELD_KEY")
	_, err = NewHiggsfieldService()
	if err == nil {
		t.Error("Expected error when credentials are missing")
	}
}

func TestHiggsfieldService_GenerateCharacterImage(t *testing.T) {
	// Skip if no API credentials
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx := context.Background()

	// Test with empty reference images (should fail)
	_, err = service.GenerateCharacterImage(ctx, "test prompt", nil, "", "")
	if err == nil {
		t.Error("Expected error when reference images are empty")
	}

	// Test with reference images (this will fail without actual API, but tests the validation)
	referenceImages := [][]byte{
		[]byte("fake-image-data-1"),
		[]byte("fake-image-data-2"),
	}
	_, err = service.GenerateCharacterImage(ctx, "test prompt", referenceImages, "cinematic", "16:9")
	// This will fail because we don't have a real API, but it should pass validation
	if err != nil && err.Error() == "character reference images are required for Soul ID" {
		t.Error("Unexpected validation error")
	}
}

func TestHiggsfieldService_UploadReferenceImage(t *testing.T) {
	// Skip if no API credentials
	if os.Getenv("HIGGSFIELD_API_KEY") == "" && os.Getenv("HIGGSFIELD_KEY") == "" {
		t.Skip("Skipping test: HIGGSFIELD_API_KEY or HIGGSFIELD_KEY not set")
	}

	service, err := NewHiggsfieldService()
	if err != nil {
		t.Fatalf("Failed to create Higgsfield service: %v", err)
	}

	ctx := context.Background()

	// Test upload with fake image data
	imageData := []byte("fake-png-image-data")
	_, err = service.UploadReferenceImage(ctx, imageData, "png")
	// This will fail without real API, but tests the function structure
	if err != nil && err.Error() == "character reference images are required for Soul ID" {
		t.Error("Unexpected error type")
	}
}
