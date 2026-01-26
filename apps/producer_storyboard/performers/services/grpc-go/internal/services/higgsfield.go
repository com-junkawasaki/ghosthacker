package services

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"
)

// HiggsfieldError represents an error from the Higgsfield API
type HiggsfieldError struct {
	StatusCode int
	Message    string
	Details    string
	TaskID     string
}

func (e *HiggsfieldError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("Higgsfield API error (status %d): %s - %s", e.StatusCode, e.Message, e.Details)
	}
	return fmt.Sprintf("Higgsfield API error (status %d): %s", e.StatusCode, e.Message)
}

// IsRetryable returns true if the error is retryable
func (e *HiggsfieldError) IsRetryable() bool {
	// Retry on 5xx errors and rate limits
	return e.StatusCode >= 500 || e.StatusCode == 429
}

// TaskPollError represents an error during task polling
type TaskPollError struct {
	TaskID     string
	Status     string
	Message    string
	Retries    int
	MaxRetries int
}

func (e *TaskPollError) Error() string {
	return fmt.Sprintf("task polling failed for task %s (status: %s, retries: %d/%d): %s",
		e.TaskID, e.Status, e.Retries, e.MaxRetries, e.Message)
}

// HiggsfieldService provides access to Higgsfield API for image and character generation
type HiggsfieldService struct {
	apiKey     string
	apiSecret  string
	httpClient *http.Client
	baseURL    string
}

// HiggsfieldImageGenerationRequest represents a Higgsfield image generation request
type HiggsfieldImageGenerationRequest struct {
	Prompt          string   `json:"prompt"`
	Style           string   `json:"style,omitempty"`
	AspectRatio     string   `json:"aspect_ratio,omitempty"`
	ReferenceImages []string `json:"reference_images,omitempty"` // Base64 encoded images for Soul ID
}

// HiggsfieldImageGenerationResponse represents the response from Higgsfield
type HiggsfieldImageGenerationResponse struct {
	TaskID    string `json:"task_id"`
	Status    string `json:"status"`
	ImageURL  string `json:"image_url,omitempty"`
	ImageData string `json:"image_data,omitempty"` // Base64 encoded image
}

// HiggsfieldTaskStatusResponse represents task status response
type HiggsfieldTaskStatusResponse struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"` // pending, processing, completed, failed
	ImageURL string `json:"image_url,omitempty"`
	Error    string `json:"error,omitempty"`
}

// HiggsfieldGenerateImageResult extends GeneratedImageResult with TaskID
type HiggsfieldGenerateImageResult struct {
	*GeneratedImageResult
	TaskID string // Higgsfield task ID
}

// NewHiggsfieldService creates a new Higgsfield service client
func NewHiggsfieldService() (*HiggsfieldService, error) {
	apiKey := os.Getenv("HIGGSFIELD_API_KEY")
	apiSecret := os.Getenv("HIGGSFIELD_API_SECRET")

	// Support combined key format: "key:secret"
	if apiKey == "" {
		combinedKey := os.Getenv("HIGGSFIELD_KEY")
		if combinedKey != "" {
			parts := strings.Split(combinedKey, ":")
			if len(parts) == 2 {
				apiKey = parts[0]
				apiSecret = parts[1]
			}
		}
	}

	if apiKey == "" {
		return nil, fmt.Errorf("HIGGSFIELD_API_KEY or HIGGSFIELD_KEY environment variable not set")
	}

	baseURL := os.Getenv("HIGGSFIELD_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.higgsfield.io/v1"
	}

	return &HiggsfieldService{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		httpClient: &http.Client{},
		baseURL:    baseURL,
	}, nil
}

// GenerateImage generates an image using Higgsfield API
func (s *HiggsfieldService) GenerateImage(ctx context.Context, prompt, style, aspectRatio string, referenceImages [][]byte) (*HiggsfieldGenerateImageResult, error) {
	reqBody := HiggsfieldImageGenerationRequest{
		Prompt:      prompt,
		Style:       style,
		AspectRatio: aspectRatio,
	}

	// Convert reference images to base64
	if len(referenceImages) > 0 {
		reqBody.ReferenceImages = make([]string, len(referenceImages))
		for i, img := range referenceImages {
			reqBody.ReferenceImages[i] = base64.StdEncoding.EncodeToString(img)
		}
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/images/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	if s.apiSecret != "" {
		req.Header.Set("X-API-Secret", s.apiSecret)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		var errorDetails string
		var apiError struct {
			Error   string `json:"error"`
			Message string `json:"message"`
			Details string `json:"details"`
		}
		if err := json.Unmarshal(body, &apiError); err == nil {
			if apiError.Message != "" {
				errorDetails = apiError.Message
			} else if apiError.Error != "" {
				errorDetails = apiError.Error
			}
			if apiError.Details != "" {
				errorDetails += ": " + apiError.Details
			}
		}
		if errorDetails == "" {
			errorDetails = string(body)
		}
		return nil, &HiggsfieldError{
			StatusCode: resp.StatusCode,
			Message:    resp.Status,
			Details:    errorDetails,
		}
	}

	var genResp HiggsfieldImageGenerationResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// If task is pending, poll for completion
	if genResp.Status == "pending" || genResp.Status == "processing" {
		imageData, err := s.pollTaskStatus(ctx, genResp.TaskID)
		if err != nil {
			return nil, fmt.Errorf("failed to poll task status: %w", err)
		}
		genResp.ImageData = base64.StdEncoding.EncodeToString(imageData)
		genResp.Status = "completed"
	}

	if genResp.Status != "completed" {
		return nil, fmt.Errorf("image generation failed with status: %s", genResp.Status)
	}

	// Decode base64 image data
	imageData, err := base64.StdEncoding.DecodeString(genResp.ImageData)
	if err != nil {
		// Try downloading from URL if provided
		if genResp.ImageURL != "" {
			imageData, err = s.downloadImage(ctx, genResp.ImageURL)
			if err != nil {
				return nil, fmt.Errorf("failed to download image: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to decode image data: %w", err)
		}
	}

	// Detect image format
	imageFormat := "png"
	if len(imageData) > 0 {
		if imageData[0] == 0xFF && imageData[1] == 0xD8 {
			imageFormat = "jpeg"
		} else if len(imageData) > 8 && string(imageData[0:8]) == "\x89PNG\r\n\x1a\n" {
			imageFormat = "png"
		}
	}

	return &HiggsfieldGenerateImageResult{
		GeneratedImageResult: &GeneratedImageResult{
			ImageData:     imageData,
			ImageFormat:   imageFormat,
			Prompt:        prompt,
			RevisedPrompt: prompt, // Higgsfield doesn't revise prompts
			Model:         "higgsfield",
		},
		TaskID: genResp.TaskID,
	}, nil
}

// GenerateCharacterImage generates a character image using Higgsfield Soul ID
func (s *HiggsfieldService) GenerateCharacterImage(ctx context.Context, prompt string, characterReferenceImages [][]byte, style, aspectRatio string) (*HiggsfieldGenerateImageResult, error) {
	if len(characterReferenceImages) == 0 {
		return nil, fmt.Errorf("character reference images are required for Soul ID")
	}

	return s.GenerateImage(ctx, prompt, style, aspectRatio, characterReferenceImages)
}

// pollTaskStatus polls the task status until completion with exponential backoff
func (s *HiggsfieldService) pollTaskStatus(ctx context.Context, taskID string) ([]byte, error) {
	maxAttempts := 60
	initialDelay := 2 * time.Second
	maxDelay := 30 * time.Second
	backoffMultiplier := 1.5
	jitterMax := 500 * time.Millisecond

	currentDelay := initialDelay
	lastError := error(nil)

	for i := 0; i < maxAttempts; i++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("context cancelled while polling task %s: %w", taskID, ctx.Err())
		default:
		}

		req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/tasks/%s", s.baseURL, taskID), nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request for task %s: %w", taskID, err)
		}

		req.Header.Set("Authorization", "Bearer "+s.apiKey)
		if s.apiSecret != "" {
			req.Header.Set("X-API-Secret", s.apiSecret)
		}

		resp, err := s.httpClient.Do(req)
		if err != nil {
			// Network errors are retryable
			lastError = fmt.Errorf("network error while polling task %s (attempt %d/%d): %w", taskID, i+1, maxAttempts, err)
			// Apply exponential backoff with jitter
			delay := s.calculateBackoffDelay(currentDelay, jitterMax, i)
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("context cancelled during backoff: %w", ctx.Err())
			case <-time.After(delay):
				currentDelay = time.Duration(float64(currentDelay) * backoffMultiplier)
				if currentDelay > maxDelay {
					currentDelay = maxDelay
				}
				continue
			}
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			var errorDetails string
			var apiError struct {
				Error   string `json:"error"`
				Message string `json:"message"`
			}
			if err := json.Unmarshal(body, &apiError); err == nil {
				if apiError.Message != "" {
					errorDetails = apiError.Message
				} else if apiError.Error != "" {
					errorDetails = apiError.Error
				}
			}
			if errorDetails == "" {
				errorDetails = string(body)
			}

			apiErr := &HiggsfieldError{
				StatusCode: resp.StatusCode,
				Message:    resp.Status,
				Details:    errorDetails,
				TaskID:     taskID,
			}

			// Retry on retryable errors
			if apiErr.IsRetryable() && i < maxAttempts-1 {
				lastError = apiErr
				delay := s.calculateBackoffDelay(currentDelay, jitterMax, i)
				select {
				case <-ctx.Done():
					return nil, fmt.Errorf("context cancelled during backoff: %w", ctx.Err())
				case <-time.After(delay):
					currentDelay = time.Duration(float64(currentDelay) * backoffMultiplier)
					if currentDelay > maxDelay {
						currentDelay = maxDelay
					}
					continue
				}
			}

			return nil, apiErr
		}

		var statusResp HiggsfieldTaskStatusResponse
		if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
			resp.Body.Close()
			return nil, fmt.Errorf("failed to decode task status response for task %s: %w", taskID, err)
		}
		resp.Body.Close()

		switch statusResp.Status {
		case "completed":
			if statusResp.ImageURL != "" {
				imageData, err := s.downloadImage(ctx, statusResp.ImageURL)
				if err != nil {
					return nil, fmt.Errorf("failed to download completed image for task %s: %w", taskID, err)
				}
				return imageData, nil
			}
			return nil, fmt.Errorf("task %s completed but no image URL provided", taskID)
		case "failed":
			return nil, &TaskPollError{
				TaskID:     taskID,
				Status:     statusResp.Status,
				Message:    statusResp.Error,
				Retries:    i + 1,
				MaxRetries: maxAttempts,
			}
		case "pending", "processing":
			// Continue polling with exponential backoff
			delay := s.calculateBackoffDelay(currentDelay, jitterMax, i)
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("context cancelled while waiting for task %s: %w", taskID, ctx.Err())
			case <-time.After(delay):
				currentDelay = time.Duration(float64(currentDelay) * backoffMultiplier)
				if currentDelay > maxDelay {
					currentDelay = maxDelay
				}
				continue
			}
		default:
			// Unknown status, retry with backoff
			lastError = fmt.Errorf("unknown task status '%s' for task %s", statusResp.Status, taskID)
			delay := s.calculateBackoffDelay(currentDelay, jitterMax, i)
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("context cancelled: %w", ctx.Err())
			case <-time.After(delay):
				currentDelay = time.Duration(float64(currentDelay) * backoffMultiplier)
				if currentDelay > maxDelay {
					currentDelay = maxDelay
				}
				continue
			}
		}
	}

	// Max attempts reached
	if lastError != nil {
		return nil, fmt.Errorf("task polling timeout for task %s after %d attempts: %w", taskID, maxAttempts, lastError)
	}
	return nil, fmt.Errorf("task polling timeout for task %s after %d attempts", taskID, maxAttempts)
}

// calculateBackoffDelay calculates the delay with exponential backoff and jitter
func (s *HiggsfieldService) calculateBackoffDelay(baseDelay time.Duration, jitterMax time.Duration, attempt int) time.Duration {
	// Exponential backoff: baseDelay * (multiplier ^ attempt)
	// For attempt 0: baseDelay, attempt 1: baseDelay * multiplier, etc.
	multiplier := 1.5
	delay := time.Duration(float64(baseDelay) * multiplier * float64(attempt+1))

	// Add jitter to prevent thundering herd using crypto/rand for better randomness
	var jitterBytes [4]byte
	if _, err := rand.Read(jitterBytes[:]); err == nil {
		jitterValue := binary.BigEndian.Uint32(jitterBytes[:])
		jitter := time.Duration(jitterValue%uint32(jitterMax.Milliseconds())) * time.Millisecond
		delay += jitter
	}

	// Cap at maxDelay
	maxDelay := 30 * time.Second
	if delay > maxDelay {
		delay = maxDelay
	}

	return delay
}

// downloadImage downloads an image from a URL
func (s *HiggsfieldService) downloadImage(ctx context.Context, imageURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", imageURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, &HiggsfieldError{
			StatusCode: resp.StatusCode,
			Message:    resp.Status,
			Details:    fmt.Sprintf("failed to download image: %s", string(body)),
		}
	}

	return io.ReadAll(resp.Body)
}

// UploadReferenceImage uploads a reference image for Soul ID
func (s *HiggsfieldService) UploadReferenceImage(ctx context.Context, imageData []byte, imageFormat string) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add image file
	part, err := writer.CreateFormFile("image", "image."+imageFormat)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(imageData); err != nil {
		return "", err
	}

	if err := writer.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/soul-id/upload", &buf)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	if s.apiSecret != "" {
		req.Header.Set("X-API-Secret", s.apiSecret)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		var errorDetails string
		var apiError struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal(body, &apiError); err == nil {
			if apiError.Message != "" {
				errorDetails = apiError.Message
			} else if apiError.Error != "" {
				errorDetails = apiError.Error
			}
		}
		if errorDetails == "" {
			errorDetails = string(body)
		}
		return "", &HiggsfieldError{
			StatusCode: resp.StatusCode,
			Message:    resp.Status,
			Details:    errorDetails,
		}
	}

	var uploadResp struct {
		ImageID string `json:"image_id"`
		URL     string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&uploadResp); err != nil {
		return "", err
	}

	return uploadResp.ImageID, nil
}
