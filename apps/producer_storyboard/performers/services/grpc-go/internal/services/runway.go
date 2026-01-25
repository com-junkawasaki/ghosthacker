package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// RunwayService provides access to Runway ML video generation API
type RunwayService struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// RunwayGenerateRequest represents a video generation request
type RunwayGenerateRequest struct {
	PromptText  string  `json:"promptText"`
	PromptImage *string `json:"promptImage,omitempty"` // Base64 or URL
	Model       string  `json:"model"`                  // "gen3a_turbo" or "gen3a"
	Duration    int     `json:"duration,omitempty"`     // 5 or 10 seconds
	AspectRatio string  `json:"aspect_ratio,omitempty"` // "16:9", "9:16", "1:1"
	Seed        *int    `json:"seed,omitempty"`
}

// RunwayGenerateResponse represents the response from Runway API
type RunwayGenerateResponse struct {
	TaskID string `json:"id"`
	Status string `json:"status"` // "PENDING", "RUNNING", "SUCCEEDED", "FAILED"
}

// RunwayTaskStatusResponse represents the status of a generation task
type RunwayTaskStatusResponse struct {
	ID          string    `json:"id"`
	Status      string    `json:"status"`
	Output      *[]string `json:"output,omitempty"`      // Video URLs
	FailureCode *string   `json:"failureCode,omitempty"`
	Failure     *string   `json:"failure,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// RunwayVideoResult represents the result of video generation
type RunwayVideoResult struct {
	TaskID    string
	Status    string
	VideoURLs []string
	Error     *string
}

// NewRunwayService creates a new Runway service client
func NewRunwayService() (*RunwayService, error) {
	apiKey := os.Getenv("RUNWAY_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("RUNWAY_API_KEY environment variable not set")
	}

	baseURL := os.Getenv("RUNWAY_API_URL")
	if baseURL == "" {
		baseURL = "https://api.dev.runwayml.com/v1"
	}

	return &RunwayService{
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    baseURL,
	}, nil
}

// GenerateVideo starts a video generation task
func (s *RunwayService) GenerateVideo(ctx context.Context, req *RunwayGenerateRequest) (*RunwayVideoResult, error) {
	if req.Model == "" {
		req.Model = "gen3a_turbo" // Default to faster model
	}
	if req.Duration == 0 {
		req.Duration = 5 // Default 5 seconds
	}

	jsonBody, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Runway-Version", "2024-11-06")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to generate video: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Runway API error: %s - %s", resp.Status, string(body))
	}

	var genResp RunwayGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &RunwayVideoResult{
		TaskID: genResp.TaskID,
		Status: genResp.Status,
	}, nil
}

// GetTaskStatus checks the status of a video generation task
func (s *RunwayService) GetTaskStatus(ctx context.Context, taskID string) (*RunwayVideoResult, error) {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/tasks/"+taskID, nil)
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)
	httpReq.Header.Set("X-Runway-Version", "2024-11-06")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get task status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Runway API error: %s - %s", resp.Status, string(body))
	}

	var statusResp RunwayTaskStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	result := &RunwayVideoResult{
		TaskID: statusResp.ID,
		Status: statusResp.Status,
	}

	if statusResp.Output != nil && len(*statusResp.Output) > 0 {
		result.VideoURLs = *statusResp.Output
	}

	if statusResp.Failure != nil {
		result.Error = statusResp.Failure
	}

	return result, nil
}

// DownloadVideo downloads the generated video file
func (s *RunwayService) DownloadVideo(ctx context.Context, videoURL string) ([]byte, error) {
	httpReq, err := http.NewRequestWithContext(ctx, "GET", videoURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download video: %s", resp.Status)
	}

	return io.ReadAll(resp.Body)
}

